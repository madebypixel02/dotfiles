/**
 * humanizer-hook.ts — AI Writing Pattern Auto-Correction Plugin
 *
 * Division of labor with the `/humanizer` skill:
 *   - This plugin runs automatically on every prose file write/edit. It applies
 *     a narrow set of conservative, word-level substitutions (see AUTO_REPLACEMENTS)
 *     and signals the user when 3 or more AI-writing patterns are detected. It is
 *     intentionally shallow: single-word swaps only, no structural rewrites.
 *   - The `/humanizer` skill is the full-depth pass. It detects all 33 AI-writing
 *     patterns, performs structural rewrites, and delivers a curated audit trail.
 *     Invoke `/humanizer` explicitly after this plugin flags a file, or any time
 *     prose quality requires thorough review.
 *
 * Watches file writes and edits targeting prose file types (*.md, *.txt, *.mdx)
 * and checks for signals that indicate AI-generated writing patterns. When 3 or
 * more signals are detected in a single file, the content is automatically
 * rewritten with the most egregious patterns replaced, and a console note is
 * logged directing the user to run /humanizer for a full pass.
 *
 * At session idle, if any files were auto-corrected during the session, a summary
 * count is logged.
 *
 * Design principles:
 *   - Auto-corrects the written content in-place via Bun.write(), but only for
 *     paths whose bounded canonical target (the resolved absolute path) falls
 *     within the project root (directory from PluginInput, with process.cwd() as
 *     fallback). Relative paths and paths that escape the project root via `..`
 *     traversal are silently skipped; the original write is unaffected.
 *   - The resolved absolute path is used exclusively for the Bun.write() call,
 *     eliminating ambiguity from relative path inputs.
 *   - Never throws — the correction is best-effort; the original write still lands
 *     if the rewrite fails or the path is rejected.
 *   - Signal detection and replacement operate on the content passed through tool
 *     args, so no extra disk read is needed.
 *   - Replacements are conservative: single-word swaps only, no structural rewrites.
 *     A full /humanizer pass handles the rest.
 */

import { isAbsolute, relative, resolve } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

/** Minimum number of distinct signals required to trigger auto-correction. */
export const SIGNAL_THRESHOLD = 3;

/** Prose file extensions that humanizer applies to. */
const PROSE_FILE_RE = /\.(md|mdx|txt)$/i;

/**
 * Signals that indicate AI-generated writing. Each entry is a regex tested
 * against the file content. Matching 3 or more triggers auto-correction.
 */
const AI_SIGNALS: RegExp[] = [
  /\u2014/,
  /\bdelve\b/i,
  /\bpivotal\b/i,
  /\bmoreover\b/i,
  /\bfurthermore\b/i,
  /\bin conclusion\b/i,
  /\bit is worth noting\b/i,
  /\btestament to\b/i,
  /\bvibrant\b/i,
];

/**
 * Conservative word-level replacements applied automatically.
 * Each entry is [pattern, replacement]. Applied in order.
 * These are the least-ambiguous substitutions — ones where the AI word
 * has a near-universal natural-language equivalent.
 */
const AUTO_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\u2014/g, " - "],
  [/\bdelve\b/gi, "explore"],
  [/\bpivotal\b/gi, "important"],
  [/\bmoreover\b/gi, "also"],
  [/\bfurthermore\b/gi, "additionally"],
  [/\bin conclusion\b/gi, "to summarise"],
  [/\bit is worth noting\b/gi, "note that"],
  [/\btestament to\b/gi, "evidence of"],
  [/\bvibrant\b/gi, "active"],
];

/** Per-session set of paths auto-corrected during the session, keyed by session ID. */
const correctedFilesMap = new Map<string, Set<string>>();

function getCorrectedFiles(sessionId: string): Set<string> {
  let entry = correctedFilesMap.get(sessionId);
  if (!entry) {
    entry = new Set();
    correctedFilesMap.set(sessionId, entry);
  }
  return entry;
}

/**
 * Returns the number of distinct AI signals found in the given content.
 * Each regex contributes at most 1 to the count regardless of match count.
 */
export function countSignals(content: string): number {
  return AI_SIGNALS.filter((re) => re.test(content)).length;
}

/**
 * Applies AUTO_REPLACEMENTS to the given content and returns the result.
 */
export function applyReplacements(content: string): string {
  let result = content;
  for (const [pattern, replacement] of AUTO_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Extracts a file path string from tool args using common field name conventions.
 */
function extractFilePath(args: Record<string, unknown>): string | undefined {
  return (
    (args.filePath as string | undefined) ??
    (args.path as string | undefined) ??
    (args.file as string | undefined)
  );
}

/**
 * Extracts the written content from tool args using common field name conventions.
 */
function extractContent(args: Record<string, unknown>): string | undefined {
  return (
    (args.content as string | undefined) ??
    (args.newString as string | undefined) ??
    (args.text as string | undefined)
  );
}

/** Returns true if the tool name corresponds to a write or edit operation. */
function isWriteOrEdit(toolName: string): boolean {
  return /^(write|edit|writeFile|write_file|editFile|edit_file)$/i.test(
    toolName,
  );
}

/**
 * Resolves `filePath` against `projectRoot` and returns the bounded canonical
 * absolute target path when it falls within the project root, or `null` when
 * the path escapes the root via `..` traversal or is otherwise out of bounds.
 *
 * The returned path is always an absolute, resolved string suitable for use
 * as the write target. Callers must use this path — not the original `filePath`
 * — for all subsequent file operations to eliminate relative-path ambiguity.
 */
export function resolveCanonicalPath(
  filePath: string,
  projectRoot: string,
): string | null {
  const absoluteRoot = resolve(projectRoot);
  const absoluteTarget = resolve(projectRoot, filePath);
  const rel = relative(absoluteRoot, absoluteTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return absoluteTarget;
}

const humanizerHookPlugin: Plugin = async ({ directory, client }) => {
  const projectRoot: string = directory ?? process.cwd();
  return {
    event: async (input) => {
      try {
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
          if (sessionId) {
            correctedFilesMap.set(sessionId, new Set());
          }
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
          const correctedFiles = correctedFilesMap.get(sessionId);
          if (correctedFiles && correctedFiles.size > 0) {
            void client.tui.showToast({
              body: {
                title: "Humanizer",
                message: `Auto-corrected AI writing patterns in ${correctedFiles.size} file(s) this session. Run /humanizer for a full prose pass.`,
                variant: "info",
              },
            });
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
          if (sessionId) correctedFilesMap.delete(sessionId);
          return;
        }
      } catch {
        return;
      }
    },

    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = input.tool ?? "";
        if (!isWriteOrEdit(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const filePath = extractFilePath(args);
        if (!filePath) return;

        const canonicalPath = resolveCanonicalPath(filePath, projectRoot);
        if (!canonicalPath) return;

        if (!PROSE_FILE_RE.test(canonicalPath)) return;

        const content = extractContent(args);
        if (!content) return;

        const signalCount = countSignals(content);
        if (signalCount < SIGNAL_THRESHOLD) return;

        const diskContent = await Bun.file(canonicalPath).text();
        const corrected = applyReplacements(diskContent);
        await Bun.write(canonicalPath, corrected);

        const sessionId = input.sessionID;
        if (sessionId) {
          getCorrectedFiles(sessionId).add(canonicalPath);
        }
        void client.tui.showToast({
          body: {
            title: "Humanizer",
            message: `Auto-corrected ${signalCount} AI writing pattern(s) in ${canonicalPath}. Run /humanizer for a full prose pass.`,
            variant: "info",
          },
        });
      } catch {
        return;
      }
    },
  };
};

export default humanizerHookPlugin satisfies Plugin;
