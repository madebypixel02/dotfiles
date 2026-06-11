/**
 * humanizer-hook.ts — AI Writing Pattern Auto-Correction Plugin
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
 *   - Auto-corrects the written content in-place via Bun.write().
 *   - Never throws — the correction is best-effort; the original write still lands
 *     if the rewrite fails.
 *   - Signal detection and replacement operate on the content passed through tool
 *     args, so no extra disk read is needed.
 *   - Replacements are conservative: single-word swaps only, no structural rewrites.
 *     A full /humanizer pass handles the rest.
 */

import type { Plugin } from "@opencode-ai/plugin";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum number of distinct signals required to trigger auto-correction. */
const SIGNAL_THRESHOLD = 3;

/** Prose file extensions that humanizer applies to. */
const PROSE_FILE_RE = /\.(md|mdx|txt)$/i;

/**
 * Signals that indicate AI-generated writing. Each entry is a regex tested
 * against the file content. Matching 3 or more triggers auto-correction.
 */
const AI_SIGNALS: RegExp[] = [
  /\u2014/, // em dash (—)
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
  [/\u2014/g, " - "],                          // em dash → spaced hyphen
  [/\bdelve\b/gi, "explore"],
  [/\bpivotal\b/gi, "important"],
  [/\bmoreover\b/gi, "also"],
  [/\bfurthermore\b/gi, "additionally"],
  [/\bin conclusion\b/gi, "to summarise"],
  [/\bit is worth noting\b/gi, "note that"],
  [/\btestament to\b/gi, "evidence of"],
  [/\bvibrant\b/gi, "active"],
];

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/** Paths of files auto-corrected during this session. */
let correctedFiles: Set<string> = new Set();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of distinct AI signals found in the given content.
 * Each regex contributes at most 1 to the count regardless of match count.
 */
function countSignals(content: string): number {
  return AI_SIGNALS.filter((re) => re.test(content)).length;
}

/**
 * Applies AUTO_REPLACEMENTS to the given content and returns the result.
 */
function applyReplacements(content: string): string {
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
    (args["filePath"] as string | undefined) ??
    (args["path"] as string | undefined) ??
    (args["file"] as string | undefined)
  );
}

/**
 * Extracts the written content from tool args using common field name conventions.
 */
function extractContent(args: Record<string, unknown>): string | undefined {
  return (
    (args["content"] as string | undefined) ??
    (args["newString"] as string | undefined) ??
    (args["text"] as string | undefined)
  );
}

/** Returns true if the tool name corresponds to a write or edit operation. */
function isWriteOrEdit(toolName: string): boolean {
  return /^(write|edit|writeFile|write_file|editFile|edit_file)$/i.test(
    toolName,
  );
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const humanizerHookPlugin: Plugin = async ({}) => {
  return {
    // ------------------------------------------------------------------
    // Reset session state on new session
    // ------------------------------------------------------------------
    event: async (input) => {
      try {
        const ev = input as Record<string, unknown>;
        const type = ev["type"] as string | undefined;
        if (!type) return;

        if (type === "session.created") {
          correctedFiles = new Set();
          return;
        }

        if (type === "session.idle") {
          if (correctedFiles.size > 0) {
            console.log(
              `\n[humanizer] Auto-corrected AI writing patterns in ${correctedFiles.size} file(s) this session. Run /humanizer for a full prose pass.\n`,
            );
          }
          return;
        }
      } catch {
        // swallow — never interrupt the session
      }
    },

    // ------------------------------------------------------------------
    // After each write/edit: scan prose files and auto-correct in-place
    // ------------------------------------------------------------------
    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = (input.tool as string | undefined) ?? "";
        if (!isWriteOrEdit(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const filePath = extractFilePath(args);
        if (!filePath) return;

        if (!PROSE_FILE_RE.test(filePath)) return;

        const content = extractContent(args);
        if (!content) return;

        const signalCount = countSignals(content);
        if (signalCount < SIGNAL_THRESHOLD) return;

        // Auto-correct: apply replacements and overwrite the file
        const corrected = applyReplacements(content);
        await Bun.write(filePath, corrected);

        correctedFiles.add(filePath);
        console.log(
          `\n[humanizer] Auto-corrected ${signalCount} AI writing pattern(s) in ${filePath}. Run /humanizer for a full prose pass.\n`,
        );
      } catch {
        // swallow — correction failures must never block tool execution
      }
    },
  };
};

export default humanizerHookPlugin satisfies Plugin;
