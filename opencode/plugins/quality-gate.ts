/**
 * quality-gate.ts — Quality Gate Enforcement Plugin
 *
 * Promotes test hygiene through non-blocking nudges:
 *
 * 1. EDIT THRESHOLD (≥3 edits):
 *    Suggests running the test suite. Applies a 2-minute cooldown so the
 *    suggestion is not repeated on every subsequent edit.
 *
 * 2. IDLE CHECK (>5 files edited, no test file touched):
 *    On session.idle warns "Consider adding tests for the changes you made."
 *
 * 3. PER-FILE TEST COVERAGE HINT:
 *    After each write/edit to a src/ file, checks whether a corresponding
 *    test file exists using common naming heuristics. If none is found,
 *    emits a reminder (never blocks the operation).
 *
 * Design principles:
 *   • NEVER throws — all warnings are advisory.
 *   • Cooldown prevents warning fatigue.
 *   • Heuristics are project-structure-aware (supports multiple layouts).
 *   • No external dependencies; file existence is checked with Bun.file().
 *   • Messages are written to .opencode/quality-gate.log in the project root
 *     in addition to console, so Web UI renderers that suppress stdout can
 *     still surface them by watching that file.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { join } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TEST_SUGGESTION_THRESHOLD = 3; // edits before suggesting test run
const IDLE_TEST_WARNING_THRESHOLD = 5; // files modified before idle warning
const COOLDOWN_MS = 2 * 60 * 1_000; // 2-minute cooldown between suggestions

/** Log file path relative to project root. Created on first write. */
const LOG_FILENAME = join(".opencode", "quality-gate.log");

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

let editCount = 0;
let lastSuggestedTestRunAt = 0;
let filesEditedThisSession: Set<string> = new Set();
let testFilesTouchedThisSession = false;
let projectRoot = process.cwd();

// ---------------------------------------------------------------------------
// Log helper — writes to console AND to .opencode/quality-gate.log
// ---------------------------------------------------------------------------

/**
 * Appends a timestamped message to .opencode/quality-gate.log and logs to
 * console. The file is created (including parent directory) if it does not
 * exist. Failures are silently swallowed — logging must never block the agent.
 */
async function emit(message: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message.trim()}\n`;
  console.log("\n" + message.trim() + "\n");
  try {
    const logPath = join(projectRoot, LOG_FILENAME);
    const dir = join(projectRoot, ".opencode");
    // Ensure directory exists
    await Bun.$`mkdir -p ${dir}`.quiet();
    await Bun.write(logPath, line, { flag: "a" });
  } catch {
    // swallow — never block the agent
  }
}

// ---------------------------------------------------------------------------
// File-system helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given file path exists on disk (using Bun.file).
 * Returns false on any error (file not found, permission denied, etc.).
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Test file detection heuristics
// ---------------------------------------------------------------------------

/**
 * Common test file suffixes and directories.
 * Given src/foo/bar.ts we attempt the following candidates:
 *
 *   tests/foo/bar.test.ts
 *   tests/foo/bar.spec.ts
 *   test/foo/bar.test.ts
 *   test/foo/bar.spec.ts
 *   src/foo/__tests__/bar.test.ts
 *   src/foo/__tests__/bar.spec.ts
 *   src/foo/bar.test.ts
 *   src/foo/bar.spec.ts
 *   __tests__/foo/bar.test.ts
 *
 * Returns the first candidate that exists on disk, or null.
 */
async function findCorrespondingTestFile(
  filePath: string,
): Promise<string | null> {
  // Normalise to forward slashes
  const normalised = filePath.replace(/\\/g, "/");

  // Extract components
  const lastSlash = normalised.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalised.slice(0, lastSlash) : ".";
  const filename =
    lastSlash >= 0 ? normalised.slice(lastSlash + 1) : normalised;

  // Strip extension
  const dotIdx = filename.lastIndexOf(".");
  const base = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx >= 0 ? filename.slice(dotIdx) : ".ts";

  // Bail early if this IS a test file
  if (/\.(test|spec)/.test(base)) return filePath;

  // Identify the source root segment (src/, lib/, app/, etc.)
  const srcRoots = ["src", "lib", "app", "source", "packages"];
  const testRoots = ["tests", "test", "__tests__", "spec"];
  const testSuffixes = [".test", ".spec"];

  const candidates: string[] = [];

  // 1. Replace src root with test root
  for (const srcRoot of srcRoots) {
    if (
      normalised.startsWith(`${srcRoot}/`) ||
      normalised.includes(`/${srcRoot}/`)
    ) {
      const relativePart = normalised.includes(`/${srcRoot}/`)
        ? normalised.slice(
            normalised.indexOf(`/${srcRoot}/`) + srcRoot.length + 2,
          )
        : normalised.slice(srcRoot.length + 1);

      const relativeDir = relativePart.slice(
        0,
        relativePart.lastIndexOf("/") + 1,
      );

      for (const testRoot of testRoots) {
        for (const suffix of testSuffixes) {
          candidates.push(`${testRoot}/${relativeDir}${base}${suffix}${ext}`);
        }
      }
    }
  }

  // 2. __tests__ sibling directory
  for (const suffix of testSuffixes) {
    candidates.push(`${dir}/__tests__/${base}${suffix}${ext}`);
  }

  // 3. Same directory co-located test
  for (const suffix of testSuffixes) {
    candidates.push(`${dir}/${base}${suffix}${ext}`);
  }

  // 4. Generic test roots at project root level
  for (const testRoot of testRoots) {
    for (const suffix of testSuffixes) {
      candidates.push(`${testRoot}/${base}${suffix}${ext}`);
    }
  }

  // Check existence for each candidate
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Returns true if the given file path looks like a test/spec file.
 */
function isTestFile(filePath: string): boolean {
  return (
    /\.(test|spec)\.[jt]sx?$/.test(filePath) ||
    /\/__tests__\//.test(filePath) ||
    /\/tests?\//.test(filePath) ||
    /\/spec\//.test(filePath)
  );
}

/**
 * Returns true if the file lives under a source directory (not test, not config).
 */
function isSourceFile(filePath: string): boolean {
  if (isTestFile(filePath)) return false;
  return (
    /\/(src|lib|app|source|packages)\//.test(filePath) ||
    filePath.startsWith("src/") ||
    filePath.startsWith("lib/") ||
    filePath.startsWith("app/")
  );
}

// ---------------------------------------------------------------------------
// Warning emitters (all non-blocking)
// ---------------------------------------------------------------------------

async function emitTestRunSuggestion(): Promise<void> {
  const now = Date.now();
  if (now - lastSuggestedTestRunAt < COOLDOWN_MS) return;
  lastSuggestedTestRunAt = now;
  await emit(
    `[quality-gate] ${editCount} file edits this session. Consider running your test suite:\n` +
    `  npm test  |  bun test  |  pnpm test  |  yarn test`,
  );
}

async function emitNoTestsWarning(): Promise<void> {
  await emit(
    `[quality-gate] Warning: ${filesEditedThisSession.size} files modified this session but no test files were touched.\n` +
    `Consider adding or updating tests to cover your changes.`,
  );
}

async function emitMissingTestHint(sourceFile: string): Promise<void> {
  await emit(
    `[quality-gate] No test file found for: ${sourceFile}\n` +
    `  Consider creating a corresponding test file to maintain coverage.`,
  );
}

// ---------------------------------------------------------------------------
// Tool name helpers
// ---------------------------------------------------------------------------

const WRITE_EDIT_TOOLS = new Set([
  "write",
  "Write",
  "edit",
  "Edit",
  "writeFile",
  "write_file",
  "editFile",
  "edit_file",
]);

function extractFilePath(args: Record<string, unknown>): string | undefined {
  return (
    (args["filePath"] as string | undefined) ??
    (args["path"] as string | undefined) ??
    (args["file"] as string | undefined)
  );
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const qualityGatePlugin: Plugin = async ({ directory, project }) => {
  projectRoot = directory ?? project?.path ?? process.cwd();

  return {
    // ------------------------------------------------------------------
    // Reset state on new session
    // ------------------------------------------------------------------
    event: async (input) => {
      const ev = input as Record<string, unknown>;
      const type = ev["type"] as string | undefined;
      if (!type) return;

      if (type === "session.created") {
        editCount = 0;
        lastSuggestedTestRunAt = 0;
        filesEditedThisSession = new Set();
        testFilesTouchedThisSession = false;
        return;
      }

      if (type === "session.idle") {
        if (
          filesEditedThisSession.size > IDLE_TEST_WARNING_THRESHOLD &&
          !testFilesTouchedThisSession
        ) {
          await emitNoTestsWarning();
        }
        return;
      }
    },

    // ------------------------------------------------------------------
    // After each write/edit: increment counter, check test coverage
    // ------------------------------------------------------------------
    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = (input.tool as string | undefined) ?? "";
        if (!WRITE_EDIT_TOOLS.has(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const filePath = extractFilePath(args);
        if (!filePath) return;

        filesEditedThisSession.add(filePath);
        editCount++;

        if (isTestFile(filePath)) {
          testFilesTouchedThisSession = true;
        }

        if (editCount >= TEST_SUGGESTION_THRESHOLD) {
          await emitTestRunSuggestion();
        }

        if (isSourceFile(filePath)) {
          void (async () => {
            try {
              const testFile = await findCorrespondingTestFile(filePath);
              if (!testFile) {
                await emitMissingTestHint(filePath);
              }
            } catch {
              // swallow
            }
          })();
        }
      } catch {
        // swallow — quality gate must never interrupt workflow
      }
    },
  };
};

export default qualityGatePlugin satisfies Plugin;
