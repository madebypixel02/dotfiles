/**
 * context-injector.ts — Smart Context Injection Plugin
 *
 * Keeps the model well-informed across long sessions by:
 *
 * 1. session.created  — Reads AGENTS.md if present and injects a summary so
 *    the agent immediately knows the project's conventions. Also detects the
 *    most recent plan artifact under ~/.config/opencode/plans/ and injects its metadata
 *    (id, status, path, updated_at) without the full plan body.
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
 *   • Plan metadata injection is a one-shot on session start; only metadata
 *     fields are injected, never the full plan body.
 *   • All untrusted strings from external sources (git output, AGENTS.md content,
 *     plan metadata, todo text) are sanitized before composition into injected
 *     markdown to prevent prompt injection.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";
import { extractFrontmatterField } from "./lib/frontmatter.js";

interface SessionSnapshot {
  branch: string;
  recentCommits: string[];
  openTodos: string[];
  sessionStartISO: string;
  elapsedMinutes: number;
  filesModified: string[];
}

interface PlanMetadata {
  id: string;
  status: string;
  path: string;
  updatedAt: string;
}

interface PerSessionState {
  startMs: number;
  filesModified: Set<string>;
  todoItems: string[];
  agentsMdInjected: boolean;
}

const sessionStateMap = new Map<string, PerSessionState>();

function getSessionState(sessionId: string): PerSessionState {
  let entry = sessionStateMap.get(sessionId);
  if (!entry) {
    entry = {
      startMs: Date.now(),
      filesModified: new Set(),
      todoItems: [],
      agentsMdInjected: false,
    };
    sessionStateMap.set(sessionId, entry);
  }
  return entry;
}

function deleteSessionState(sessionId: string): void {
  sessionStateMap.delete(sessionId);
}

function extractSessionId(ev: Record<string, unknown>): string | null {
  const properties = (ev.properties ?? {}) as Record<string, unknown>;
  const info = (properties.info ?? {}) as Record<string, unknown>;
  const id =
    (info.id as string | undefined) ??
    (properties.sessionID as string | undefined) ??
    (properties.id as string | undefined);
  return id ?? null;
}

const GIT_COMMIT_COUNT_MIN = 1;
const GIT_COMMIT_COUNT_MAX = 50;

/** Maximum character length for any single sanitized string injected into context. */
const MAX_INJECTED_STRING_LENGTH = 500;

/**
 * Returns true when the character at the given code point is a non-printing
 * control character that should be stripped before injecting into model context.
 * Preserves tab (0x09), line feed (0x0a), and carriage return (0x0d).
 */
function isStrippableControlChar(codePoint: number): boolean {
  return (
    codePoint <= 0x08 ||
    codePoint === 0x0b ||
    codePoint === 0x0c ||
    (codePoint >= 0x0e && codePoint <= 0x1f) ||
    codePoint === 0x7f
  );
}

/**
 * Sanitizes an untrusted string before it is composed into injected markdown context.
 * Strips non-printing control characters and truncates to a safe maximum length.
 */
function sanitizeForInjection(raw: string): string {
  const truncated = raw.slice(0, MAX_INJECTED_STRING_LENGTH);
  let result = "";
  for (let i = 0; i < truncated.length; i++) {
    const cp = truncated.charCodeAt(i);
    if (!isStrippableControlChar(cp)) {
      result += truncated[i];
    }
  }
  return result;
}

/**
 * Sanitizes a file path string for safe display in injected markdown.
 * Keeps only printable ASCII characters that are valid in paths.
 */
function sanitizeFilePath(raw: string): string {
  const truncated = raw.slice(0, MAX_INJECTED_STRING_LENGTH);
  return truncated.replace(/[^\x20-\x7e]/g, "");
}

/**
 * Escapes markdown structural characters in a string so that user-controlled
 * text cannot break list items, headings, code spans, or block structure when
 * interpolated into injected markdown.
 */
function escapeMarkdown(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/^(#{1,6})\s/gm, "\\$1 ")
    .replace(/^[-*+]\s/gm, "\\- ")
    .replace(/^\d+\.\s/gm, (m) => `\\${m}`);
}

/**
 * Spawns a git subprocess without a shell, using an explicit argument array.
 * Returns stdout as a trimmed string, or null on failure.
 */
async function spawnGit(args: string[], cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
    const raw = await new Response(proc.stdout).text();
    return raw.trim();
  } catch {
    return null;
  }
}

/**
 * Returns the current git branch name for the given working directory.
 * Falls back to a descriptive string when git is unavailable or HEAD is detached.
 */
async function gitCurrentBranch(cwd: string): Promise<string> {
  const output = await spawnGit(["-C", cwd, "branch", "--show-current"], cwd);
  return output || "(git unavailable)";
}

/**
 * Returns the most recent `n` git commits in oneline format.
 * `n` is clamped to the range [GIT_COMMIT_COUNT_MIN, GIT_COMMIT_COUNT_MAX].
 * Returns an empty array when git is unavailable.
 */
async function gitRecentCommits(cwd: string, n = 5): Promise<string[]> {
  const safeN = Math.min(GIT_COMMIT_COUNT_MAX, Math.max(GIT_COMMIT_COUNT_MIN, Math.floor(n)));
  const output = await spawnGit(["-C", cwd, "log", "--oneline", `-${safeN}`], cwd);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

/**
 * Searches known candidate paths for an AGENTS.md file and returns its content.
 * Returns null when no file is found at any candidate location.
 */
async function readAgentsMd(projectRoot: string): Promise<string | null> {
  const candidates = [
    join(projectRoot, "AGENTS.md"), // nosemgrep: path-join-resolve-traversal
    join(projectRoot, ".opencode", "AGENTS.md"), // nosemgrep: path-join-resolve-traversal
    join(projectRoot, "docs", "AGENTS.md"), // nosemgrep: path-join-resolve-traversal
  ];

  for (const candidate of candidates) {
    try {
      const file = Bun.file(candidate);
      const exists = await file.exists();
      if (exists) {
        const text = await file.text();
        return text;
      }
    } catch {}
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
        `\n... (${content.length - charCount} chars truncated — read AGENTS.md for full content)`,
      );
      break;
    }
    summary.push(line);
    charCount += line.length + 1;
  }

  return summary.join("\n");
}

/**
 * Reads plan files from ~/.config/opencode/plans/ and returns metadata for the most
 * recently updated plan. Only injects id, status, path, and updated_at —
 * never the full plan body. Returns null when the directory does not exist or
 * contains no plan files.
 *
 * Candidate file names are validated to contain only safe characters (alphanumerics,
 * hyphens, underscores, and dots) to prevent path traversal. The resolved path of
 * each candidate is verified to be prefixed by the plans directory before reading.
 */
async function readMostRecentPlanMetadata(): Promise<PlanMetadata | null> {
  const plansDir = join(homedir(), ".config", "opencode", "plans"); // nosemgrep: path-join-resolve-traversal
  try {
    const glob = new Bun.Glob("*.md");
    const entries: Array<{ name: string; validatedPath: string; updatedAt: string }> = [];

    for await (const name of glob.scan({ cwd: plansDir })) {
      if (!/^[\w.-]+\.md$/.test(name)) continue;
      const filePath = join(plansDir, name); // nosemgrep: path-join-resolve-traversal
      if (!filePath.startsWith(`${plansDir}/`)) continue;
      const file = Bun.file(filePath);
      const fileContent = await file.text();
      const updatedAt = extractFrontmatterField(fileContent, "updated_at") ?? "";
      entries.push({ name, validatedPath: filePath, updatedAt });
    }

    if (entries.length === 0) return null;

    entries.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.NaN;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.NaN;
      const aValid = !Number.isNaN(dateA);
      const bValid = !Number.isNaN(dateB);
      if (aValid && bValid) {
        if (dateB !== dateA) return dateB - dateA;
        return a.name.localeCompare(b.name);
      }
      if (aValid) return -1;
      if (bValid) return 1;
      return a.name.localeCompare(b.name);
    });
    const most = entries[0];
    const content = await Bun.file(most.validatedPath).text();

    const id = sanitizeForInjection(extractFrontmatterField(content, "id") ?? most.name);
    const status = sanitizeForInjection(extractFrontmatterField(content, "status") ?? "unknown");
    const updatedAt = sanitizeForInjection(most.updatedAt);
    const displayPath = `~/.config/opencode/plans/${sanitizeFilePath(most.name)}`;

    return { id, status, path: displayPath, updatedAt };
  } catch {
    return null;
  }
}

/**
 * Builds a session snapshot capturing git state, todos, elapsed time, and
 * modified files for use in context compaction injection.
 */
async function buildSessionSnapshot(
  cwd: string,
  sessionState: PerSessionState,
): Promise<SessionSnapshot> {
  const [branch, recentCommits] = await Promise.all([gitCurrentBranch(cwd), gitRecentCommits(cwd)]);

  const elapsedMs = Date.now() - sessionState.startMs;
  const elapsedMinutes = Math.round(elapsedMs / 60_000);

  return {
    branch: sanitizeForInjection(branch),
    recentCommits: recentCommits.map(sanitizeForInjection),
    openTodos: [...sessionState.todoItems],
    sessionStartISO: new Date(sessionState.startMs).toISOString(),
    elapsedMinutes,
    filesModified: Array.from(sessionState.filesModified).map(sanitizeFilePath),
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
    for (const c of snap.recentCommits) {
      sections.push(`- \`${c}\``);
    }
    sections.push("");
  }

  if (snap.filesModified.length > 0) {
    sections.push("### Files Modified This Session");
    for (const f of snap.filesModified) {
      sections.push(`- \`${f}\``);
    }
    sections.push("");
  }

  if (snap.openTodos.length > 0) {
    sections.push("### Open TODOs");
    for (const t of snap.openTodos) {
      sections.push(`- ${escapeMarkdown(t)}`);
    }
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

const contextInjectorPlugin: Plugin = async ({ client, project, directory }) => {
  const cwd = directory ?? project?.worktree ?? process.cwd();

  return {
    event: async (input) => {
      const ev = input.event as Record<string, unknown>;
      if (!ev || typeof ev !== "object") return;
      const type = ev.type as string | undefined;
      if (!type) return;

      if (type === "session.created") {
        const sessionId = extractSessionId(ev);
        if (!sessionId) return;

        const sessionState = getSessionState(sessionId);
        sessionState.startMs = Date.now();
        sessionState.filesModified = new Set();
        sessionState.todoItems = [];
        sessionState.agentsMdInjected = false;

        /**
         * The three fire-and-forget async blocks below (git context, AGENTS.md,
         * and plan metadata) run concurrently with no guaranteed injection order.
         * The OpenCode inject() API is order-insensitive: each injected block is
         * appended to the context independently, so parallel execution is safe.
         * Do not sequentialise these blocks unless the API explicitly requires
         * ordered injection.
         */

        void (async () => {
          try {
            const [branch, recentCommits] = await Promise.all([
              gitCurrentBranch(cwd),
              gitRecentCommits(cwd, 5),
            ]);

            const sanitizedBranch = sanitizeForInjection(branch);
            const sanitizedCommits = recentCommits.map(sanitizeForInjection);

            const gitLines = [
              "## Git Context (injected at session start)",
              "",
              `**Branch:** \`${sanitizedBranch}\``,
              "",
            ];

            if (sanitizedCommits.length > 0) {
              gitLines.push("**Recent commits:**");
              for (const c of sanitizedCommits) {
                gitLines.push(`- \`${c}\``);
              }
              gitLines.push("");
            }

            gitLines.push(
              "_This context is injected automatically. Run `git status` or `git log` for live updates._",
            );

            const gitMessage = gitLines.join("\n");

            if (
              client &&
              typeof (client as unknown as Record<string, unknown>).inject === "function"
            ) {
              await (client as unknown as { inject: (msg: string) => Promise<void> }).inject(
                gitMessage,
              );
            }
          } catch {
            return;
          }
        })();

        void (async () => {
          try {
            const current = sessionStateMap.get(sessionId);
            if (!current || current.agentsMdInjected) return;
            const content = await readAgentsMd(cwd);
            if (!content) return;

            const summary = sanitizeForInjection(summariseAgentsMd(content));
            const message = [
              "## Project Agent Instructions (from AGENTS.md)",
              "",
              summary,
              "",
              "_This summary was automatically injected at session start._",
            ].join("\n");

            if (
              client &&
              typeof (client as unknown as Record<string, unknown>).inject === "function"
            ) {
              await (client as unknown as { inject: (msg: string) => Promise<void> }).inject(
                message,
              );
            }

            const afterInject = sessionStateMap.get(sessionId);
            if (afterInject) {
              afterInject.agentsMdInjected = true;
            }
          } catch {
            return;
          }
        })();

        void (async () => {
          try {
            const planMetadata = await readMostRecentPlanMetadata();
            if (!planMetadata) return;

            const lines = [
              "## Active Plan Artifact (injected at session start)",
              "",
              `**Plan ID:** ${planMetadata.id}`,
              `**Status:** ${planMetadata.status}`,
              `**Path:** \`${planMetadata.path}\``,
              `**Updated:** ${planMetadata.updatedAt}`,
              "",
              "_Read the plan file directly for full content. This block contains metadata only._",
            ];

            const message = lines.join("\n");

            if (
              client &&
              typeof (client as unknown as Record<string, unknown>).inject === "function"
            ) {
              await (client as unknown as { inject: (msg: string) => Promise<void> }).inject(
                message,
              );
            }
          } catch {
            return;
          }
        })();

        return;
      }

      if (type === "file.edited") {
        const sessionId = extractSessionId(ev);
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const path = properties.file as string | undefined;
        if (path && sessionId) {
          getSessionState(sessionId).filesModified.add(path);
        }
        return;
      }

      if (type === "session.diff") {
        const sessionId = extractSessionId(ev);
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const diff = properties.diff as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(diff) && sessionId) {
          const sessionState = getSessionState(sessionId);
          for (const entry of diff) {
            const file = entry.file as string | undefined;
            if (file) sessionState.filesModified.add(file);
          }
        }
        return;
      }

      if (type === "session.deleted" || type === "session.end") {
        const sessionId = extractSessionId(ev);
        if (sessionId) {
          deleteSessionState(sessionId);
        }
        return;
      }

      if (type === "todo.updated") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const sessionId = properties.sessionID as string | undefined;
        if (!sessionId) return;

        const todos = properties.todos as Array<{ content?: string; status?: string }> | undefined;
        if (!Array.isArray(todos)) return;

        const sessionState = sessionStateMap.get(sessionId);
        if (!sessionState) return;

        sessionState.todoItems = todos
          .filter((t) => t.status !== "completed")
          .map((t) => {
            const status = t.status ? `[${sanitizeForInjection(t.status)}]` : "[todo]";
            const content = sanitizeForInjection(t.content ?? "(untitled)");
            return `${status} ${content}`;
          });
        return;
      }
    },

    "tool.execute.after": async (input, _output) => {
      try {
        const toolName = input.tool ?? "";
        if (!["todowrite", "TodoWrite", "todo_write"].includes(toolName)) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const todos = args.todos as Array<{ content?: string; status?: string }> | undefined;
        if (!Array.isArray(todos)) return;

        const sessionId = input.sessionID;
        if (!sessionId) return;

        const sessionState = sessionStateMap.get(sessionId);
        if (!sessionState) return;

        sessionState.todoItems = todos
          .filter((t) => t.status !== "completed")
          .map((t) => {
            const status = t.status ? `[${sanitizeForInjection(t.status)}]` : "[todo]";
            const content = sanitizeForInjection(t.content ?? "(untitled)");
            return `${status} ${content}`;
          });
      } catch {
        return;
      }
    },

    "experimental.session.compacting": async (input, output) => {
      try {
        const sessionId = input.sessionID;
        const sessionState = sessionId ? sessionStateMap.get(sessionId) : undefined;
        if (!sessionState) return;

        const snapshot = await buildSessionSnapshot(cwd, sessionState);
        const snapshotMarkdown = snapshotToMarkdown(snapshot);

        output.context.push(snapshotMarkdown);
      } catch {
        return;
      }
    },
  };
};

export default contextInjectorPlugin satisfies Plugin;
