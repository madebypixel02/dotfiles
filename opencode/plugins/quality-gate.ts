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

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

const TEST_SUGGESTION_THRESHOLD = 3;
const IDLE_TEST_WARNING_THRESHOLD = 5;
const COOLDOWN_MS = 2 * 60 * 1_000;

/** Log file path relative to project root. Created on first write. */
const LOG_FILENAME = join(".opencode", "quality-gate.log");

interface QualityGateSessionState {
  editCount: number;
  lastSuggestedTestRunAt: number;
  filesEditedThisSession: Set<string>;
  testFilesTouchedThisSession: boolean;
}

const sessionStateMap = new Map<string, QualityGateSessionState>();

function getSessionState(sessionId: string): QualityGateSessionState {
  let entry = sessionStateMap.get(sessionId);
  if (!entry) {
    entry = {
      editCount: 0,
      lastSuggestedTestRunAt: 0,
      filesEditedThisSession: new Set(),
      testFilesTouchedThisSession: false,
    };
    sessionStateMap.set(sessionId, entry);
  }
  return entry;
}

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
  const normalised = filePath.replace(/\\/g, "/");

  const lastSlash = normalised.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalised.slice(0, lastSlash) : ".";
  const filename =
    lastSlash >= 0 ? normalised.slice(lastSlash + 1) : normalised;

  const dotIdx = filename.lastIndexOf(".");
  const base = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx >= 0 ? filename.slice(dotIdx) : ".ts";

  if (/\.(test|spec)/.test(base)) return filePath;

  const srcRoots = ["src", "lib", "app", "source", "packages"];
  const testRoots = ["tests", "test", "__tests__", "spec"];
  const testSuffixes = [".test", ".spec"];

  const candidates: string[] = [];

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

  for (const suffix of testSuffixes) {
    candidates.push(`${dir}/__tests__/${base}${suffix}${ext}`);
  }

  for (const suffix of testSuffixes) {
    candidates.push(`${dir}/${base}${suffix}${ext}`);
  }

  for (const testRoot of testRoots) {
    for (const suffix of testSuffixes) {
      candidates.push(`${testRoot}/${base}${suffix}${ext}`);
    }
  }

  const results = await Promise.all(
    candidates.map((c) => fileExists(c).then((exists) => ({ exists, c }))),
  );
  const found = results.find((r) => r.exists);
  return found ? found.c : null;
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
    (args.filePath as string | undefined) ??
    (args.path as string | undefined) ??
    (args.file as string | undefined)
  );
}

const qualityGatePlugin: Plugin = async ({ directory, project, client }) => {
  const projectRoot = directory ?? project?.worktree ?? process.cwd();

  async function emit(message: string): Promise<void> {
    const line = `[${new Date().toISOString()}] ${message.trim()}\n`;
    void client.tui.showToast({
      body: {
        title: "Quality Gate",
        message: message.trim(),
        variant: "warning",
      },
    });
    try {
      const logPath = join(projectRoot, LOG_FILENAME);
      const dir = join(projectRoot, ".opencode");
      await mkdir(dir, { recursive: true });
      await appendFile(logPath, line);
    } catch {
      return;
    }
  }

  async function emitTestRunSuggestion(
    sessionState: QualityGateSessionState,
  ): Promise<void> {
    const now = Date.now();
    if (now - sessionState.lastSuggestedTestRunAt < COOLDOWN_MS) return;
    sessionState.lastSuggestedTestRunAt = now;
    await emit(
      `[quality-gate] ${sessionState.editCount} file edits this session. Consider running your test suite:\n` +
        `  npm test  |  bun test  |  pnpm test  |  yarn test`,
    );
  }

  async function emitNoTestsWarning(
    sessionState: QualityGateSessionState,
  ): Promise<void> {
    await emit(
      `[quality-gate] Warning: ${sessionState.filesEditedThisSession.size} files modified this session but no test files were touched.\n` +
        `Consider adding or updating tests to cover your changes.`,
    );
  }

  async function emitMissingTestHint(sourceFile: string): Promise<void> {
    await emit(
      `[quality-gate] No test file found for: ${sourceFile}\n` +
        `  Consider creating a corresponding test file to maintain coverage.`,
    );
  }

  return {
    event: async (input) => {
      const ev = input.event as Record<string, unknown>;
      if (!ev || typeof ev !== "object") return;
      const type = ev.type as string | undefined;
      if (!type) return;

      if (type === "session.created") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const info = (properties.info ?? {}) as Record<string, unknown>;
        const sessionId =
          (info.id as string | undefined) ??
          (properties.sessionID as string | undefined) ??
          (properties.id as string | undefined);
        if (!sessionId) return;
        sessionStateMap.set(sessionId, {
          editCount: 0,
          lastSuggestedTestRunAt: 0,
          filesEditedThisSession: new Set(),
          testFilesTouchedThisSession: false,
        });
        return;
      }

      if (type === "session.idle") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const info = (properties.info ?? {}) as Record<string, unknown>;
        const sessionId =
          (info.id as string | undefined) ??
          (properties.sessionID as string | undefined) ??
          (properties.id as string | undefined);
        if (!sessionId) return;
        const sessionState = sessionStateMap.get(sessionId);
        if (!sessionState) return;
        if (
          sessionState.filesEditedThisSession.size >
            IDLE_TEST_WARNING_THRESHOLD &&
          !sessionState.testFilesTouchedThisSession
        ) {
          await emitNoTestsWarning(sessionState);
        }
        return;
      }

      if (type === "session.deleted" || type === "session.end") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const info = (properties.info ?? {}) as Record<string, unknown>;
        const sessionId =
          (info.id as string | undefined) ??
          (properties.sessionID as string | undefined) ??
          (properties.id as string | undefined);
        if (sessionId) sessionStateMap.delete(sessionId);
        return;
      }
    },

    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = input.tool ?? "";
        if (!WRITE_EDIT_TOOLS.has(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const filePath = extractFilePath(args);
        if (!filePath) return;

        const sessionId = input.sessionID;
        if (!sessionId) return;
        const sessionState = getSessionState(sessionId);

        sessionState.filesEditedThisSession.add(filePath);
        sessionState.editCount++;

        if (isTestFile(filePath)) {
          sessionState.testFilesTouchedThisSession = true;
        }

        if (sessionState.editCount >= TEST_SUGGESTION_THRESHOLD) {
          await emitTestRunSuggestion(sessionState);
        }

        if (isSourceFile(filePath)) {
          void (async () => {
            try {
              const testFile = await findCorrespondingTestFile(filePath);
              if (!testFile) {
                await emitMissingTestHint(filePath);
              }
            } catch {
              return;
            }
          })();
        }
      } catch {
        return;
      }
    },
  };
};

export default qualityGatePlugin satisfies Plugin;
