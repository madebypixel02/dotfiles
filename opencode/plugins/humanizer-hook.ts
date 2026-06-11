/**
 * humanizer-hook.ts — AI Writing Pattern Detection Plugin
 *
 * Watches file writes and edits targeting prose file types (*.md, *.txt, *.mdx)
 * and checks for signals that indicate AI-generated writing patterns. When 3 or
 * more signals are detected in a single file, a non-blocking advisory is logged
 * directing the user to run /humanizer.
 *
 * At session idle, if any files were flagged during the session, a summary count
 * is logged.
 *
 * Design principles:
 *   - Non-blocking: never throws, never interrupts tool execution.
 *   - Advisory only: logs to console; does not modify files or block writes.
 *   - Minimal footprint: no external dependencies, no file system reads.
 *   - Signal detection operates on the written content passed through tool args.
 */

import type { Plugin } from "@opencode-ai/plugin";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum number of distinct signals required to trigger a warning. */
const SIGNAL_THRESHOLD = 3;

/** Prose file extensions that humanizer applies to. */
const PROSE_FILE_RE = /\.(md|mdx|txt)$/i;

/**
 * Signals that indicate AI-generated writing. Each entry is a regex tested
 * against the file content. Matching 3 or more triggers the advisory.
 */
const AI_SIGNALS: RegExp[] = [
  /\u2014/, // em dash (—)
  /\bdelve\b/i, // AI vocabulary
  /\bpivotal\b/i, // AI vocabulary
  /\bmoreover\b/i, // transition filler
  /\bfurthermore\b/i, // transition filler
  /\bin conclusion\b/i, // formulaic closing
  /\bit is worth noting\b/i, // excessive hedging opener
  /\btestament to\b/i, // AI vocabulary pattern
  /\bvibrant\b/i, // AI vocabulary
];

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/** Paths of files flagged during this session. */
let flaggedFiles: Set<string> = new Set();

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

        // ── session.created — reset state ─────────────────────────────
        if (type === "session.created") {
          flaggedFiles = new Set();
          return;
        }

        // ── session.idle — emit session summary if files were flagged ──
        if (type === "session.idle") {
          if (flaggedFiles.size > 0) {
            console.log(
              `\n[humanizer] ${flaggedFiles.size} file(s) may benefit from /humanizer pass.\n`,
            );
          }
          return;
        }
      } catch {
        // swallow — never interrupt the session
      }
    },

    // ------------------------------------------------------------------
    // After each write/edit: scan prose files for AI-writing signals
    // ------------------------------------------------------------------
    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = (input.tool as string | undefined) ?? "";
        if (!isWriteOrEdit(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const filePath = extractFilePath(args);
        if (!filePath) return;

        // Only inspect prose file types
        if (!PROSE_FILE_RE.test(filePath)) return;

        const content = extractContent(args);
        if (!content) return;

        const signalCount = countSignals(content);
        if (signalCount >= SIGNAL_THRESHOLD) {
          flaggedFiles.add(filePath);
          console.log(
            `\n[humanizer] AI-writing patterns detected in ${filePath}. Run /humanizer to clean up.\n`,
          );
        }
      } catch {
        // swallow — advisory failures must never block tool execution
      }
    },
  };
};

export default humanizerHookPlugin satisfies Plugin;
