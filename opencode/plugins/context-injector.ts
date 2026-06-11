/**
 * context-injector.ts — Smart Context Injection Plugin
 *
 * Keeps the model well-informed across long sessions by:
 *
 * 1. session.created  — Reads AGENTS.md if present and injects a summary so
 *    the agent immediately knows the project's conventions.
 *
 * 2. file.edited      — Tracks every file touched during the session so that
 *    the "compaction" snapshot is accurate.
 *
 * 3. experimental.session.compacting — Before the context window is compressed,
 *    injects a rich "session snapshot" that preserves:
 *      • Current git branch
 *      • Last 5 git commits (oneline)
 *      • Open TODOs (todowrite state is unavailable directly, so we read the
 *        last known todowrite tool output stored in session memory)
 *      • Session start time and elapsed time
 *      • All files modified in this session
 *
 * Design principles:
 *   • Non-blocking — every async operation is fire-and-forget where possible.
 *   • Git calls are best-effort; if git is not available the snapshot omits
 *     those fields gracefully.
 *   • AGENTS.md injection is a one-shot on session start.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionSnapshot {
  branch: string;
  recentCommits: string[];
  openTodos: string[];
  sessionStartISO: string;
  elapsedMinutes: number;
  filesModified: string[];
}

// ---------------------------------------------------------------------------
// In-memory session state
// ---------------------------------------------------------------------------

let sessionStartMs = 0;
let filesModified: Set<string> = new Set();
let todoItems: string[] = [];
let agentsMdInjected = false;

// ---------------------------------------------------------------------------
// Git helpers (non-blocking — all errors return fallback values)
// ---------------------------------------------------------------------------

async function gitCurrentBranch(cwd: string): Promise<string> {
  try {
    const result = await Bun.$`git -C ${cwd} branch --show-current`.quiet();
    return result.stdout.toString().trim() || "HEAD (detached)";
  } catch {
    return "(git unavailable)";
  }
}

async function gitRecentCommits(cwd: string, n = 5): Promise<string[]> {
  try {
    const result = await Bun.$`git -C ${cwd} log --oneline -${n}`.quiet();
    return result.stdout.toString().trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// AGENTS.md reader
// ---------------------------------------------------------------------------

async function readAgentsMd(projectRoot: string): Promise<string | null> {
  const candidates = [
    join(projectRoot, "AGENTS.md"),
    join(projectRoot, ".opencode", "AGENTS.md"),
    join(projectRoot, "docs", "AGENTS.md"),
  ];

  for (const candidate of candidates) {
    try {
      const file = Bun.file(candidate);
      const exists = await file.exists();
      if (exists) {
        const text = await file.text();
        return text;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Produces a condensed summary of AGENTS.md content.
 * Truncates to ~2000 chars to avoid overwhelming the context with the full doc.
 */
function summariseAgentsMd(content: string): string {
  const lines = content.split("\n");
  const summary: string[] = [];
  let charCount = 0;
  const LIMIT = 2000;

  for (const line of lines) {
    if (charCount + line.length > LIMIT) {
      summary.push(
        `\n… (${content.length - charCount} chars truncated — read AGENTS.md for full content)`,
      );
      break;
    }
    summary.push(line);
    charCount += line.length + 1;
  }

  return summary.join("\n");
}

// ---------------------------------------------------------------------------
// Session snapshot builder
// ---------------------------------------------------------------------------

async function buildSessionSnapshot(cwd: string): Promise<SessionSnapshot> {
  const [branch, recentCommits] = await Promise.all([
    gitCurrentBranch(cwd),
    gitRecentCommits(cwd),
  ]);

  const elapsedMs = Date.now() - sessionStartMs;
  const elapsedMinutes = Math.round(elapsedMs / 60_000);

  return {
    branch,
    recentCommits,
    openTodos: [...todoItems],
    sessionStartISO: new Date(sessionStartMs).toISOString(),
    elapsedMinutes,
    filesModified: Array.from(filesModified),
  };
}

function snapshotToMarkdown(snap: SessionSnapshot): string {
  const sections: string[] = [
    "## Session Context Snapshot",
    "",
    `**Session started:** ${snap.sessionStartISO}  `,
    `**Elapsed:** ${snap.elapsedMinutes} minute${snap.elapsedMinutes !== 1 ? "s" : ""}`,
    "",
    `### Git Branch`,
    `\`${snap.branch}\``,
    "",
  ];

  if (snap.recentCommits.length > 0) {
    sections.push("### Recent Commits (last 5)");
    snap.recentCommits.forEach((c) => sections.push(`- \`${c}\``));
    sections.push("");
  }

  if (snap.filesModified.length > 0) {
    sections.push("### Files Modified This Session");
    snap.filesModified.forEach((f) => sections.push(`- \`${f}\``));
    sections.push("");
  }

  if (snap.openTodos.length > 0) {
    sections.push("### Open TODOs");
    snap.openTodos.forEach((t) => sections.push(`- ${t}`));
    sections.push("");
  } else {
    sections.push("### Open TODOs");
    sections.push("_No tracked TODOs_");
    sections.push("");
  }

  sections.push(
    "> This snapshot was automatically injected before context compaction.",
    "> Continue working with full awareness of the above context.",
  );

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const contextInjectorPlugin: Plugin = async ({
  client,
  project,
  directory,
}) => {
  // Determine project working directory
  const cwd = directory ?? project?.path ?? process.cwd();

  return {
    // ------------------------------------------------------------------
    // Session start: inject AGENTS.md summary
    // ------------------------------------------------------------------
    event: async (input) => {
      const ev = input as Record<string, unknown>;
      const type = ev["type"] as string | undefined;
      if (!type) return;

      // ── session.created ────────────────────────────────────────────
      if (type === "session.created") {
        sessionStartMs = Date.now();
        filesModified = new Set();
        todoItems = [];
        agentsMdInjected = false;

        // Fire-and-forget: inject AGENTS.md if it exists
        void (async () => {
          try {
            if (agentsMdInjected) return;
            const content = await readAgentsMd(cwd);
            if (!content) return;

            const summary = summariseAgentsMd(content);
            const message = [
              "## Project Agent Instructions (from AGENTS.md)",
              "",
              summary,
              "",
              "_This summary was automatically injected at session start._",
            ].join("\n");

            // Attempt to inject via client if available
            if (
              client &&
              typeof (client as Record<string, unknown>)["inject"] ===
                "function"
            ) {
              await (
                client as { inject: (msg: string) => Promise<void> }
              ).inject(message);
            } else {
              // Fallback: print to console so it appears in the TUI
              console.log("\n[context-injector] " + message + "\n");
            }

            agentsMdInjected = true;
          } catch {
            // non-blocking: ignore errors
          }
        })();
        return;
      }

      // ── file.edited — track modified files ─────────────────────────
      if (type === "file.edited") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const path =
          (properties["path"] as string | undefined) ??
          (properties["file"] as string | undefined);
        if (path) {
          filesModified.add(path);
        }
        return;
      }

      // ── session.diff — alternative event for file tracking ─────────
      if (type === "session.diff") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const files = properties["files"] as string[] | undefined;
        if (Array.isArray(files)) {
          files.forEach((f) => filesModified.add(f));
        }
        return;
      }
    },

    // ------------------------------------------------------------------
    // Track todowrite tool output to maintain TODO list
    // ------------------------------------------------------------------
    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = (input.tool as string | undefined) ?? "";
        if (!["todowrite", "TodoWrite", "todo_write"].includes(toolName))
          return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const todos = args["todos"] as
          | Array<{ content?: string; status?: string }>
          | undefined;
        if (!Array.isArray(todos)) return;

        // Keep only in-progress or pending todos
        todoItems = todos
          .filter((t) => t.status !== "completed")
          .map((t) => {
            const status = t.status ? `[${t.status}]` : "[todo]";
            return `${status} ${t.content ?? "(untitled)"}`;
          });
      } catch {
        // swallow
      }
    },

    // ------------------------------------------------------------------
    // Pre-compaction: inject rich session snapshot
    // ------------------------------------------------------------------
    "experimental.session.compacting": async (_input, output) => {
      try {
        const snapshot = await buildSessionSnapshot(cwd);
        const snapshotMarkdown = snapshotToMarkdown(snapshot);

        // Append our snapshot to whatever the compaction system is building
        const current = (output as Record<string, unknown>)[
          "additionalContext"
        ] as string | undefined;
        (output as Record<string, unknown>)["additionalContext"] = current
          ? `${current}\n\n${snapshotMarkdown}`
          : snapshotMarkdown;
      } catch {
        // Non-blocking: never block compaction
      }
    },
  };
};

export default contextInjectorPlugin satisfies Plugin;
