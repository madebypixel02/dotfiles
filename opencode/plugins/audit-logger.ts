/**
 * audit-logger.ts — Enterprise Audit Logging Plugin
 *
 * Writes a JSONL audit trail to ~/.local/share/opencode/audit/YYYY-MM-DD.jsonl.
 * Every line is a self-contained JSON object (one per log entry).
 *
 * Logged events:
 *   session.start      — session ID, model, agent, ISO timestamp
 *   tool.execute       — tool name, sanitised args summary, duration (ms), success flag
 *   plan.created       — plan file path, plan ID, status (always "draft" at creation)
 *   plan.updated       — plan file path, plan ID, new status
 *   plan.approved      — plan file path, plan ID (emitted when status becomes "approved")
 *   session.idle       — total tokens, cost estimate, files modified in the session
 *   session.end        — session ID, total duration, ISO timestamp
 *
 * Design principles:
 *   • Non-blocking: every async path is fire-and-forget; errors are swallowed.
 *   • Sanitisation: any arg field named password/token/key/secret/apiKey has
 *     its value replaced with "[REDACTED]" before logging.
 *   • Directory auto-creation: the audit directory is created if it does not exist.
 *   • Plan events are derived from file.edited events on paths matching
 *     ~/.config/opencode/plans/*.md. The plugin reads the frontmatter to determine
 *     the plan ID and status at each write.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";
import { escapeRegex, extractFrontmatterField } from "./lib/frontmatter.js";

interface AuditEntry {
  ts: string;
  event: string;
  sessionId?: string;
  model?: string;
  agent?: string;
  tool?: string;
  argsSummary?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  error?: string;
  totalTokens?: number;
  costEstimateUsd?: number;
  filesModified?: string[];
  totalDurationMs?: number;
  planId?: string;
  planPath?: string;
  planStatus?: string;
}

/** Fields whose values should never appear in logs. Case-insensitive match. */
const SENSITIVE_FIELD_RE =
  /^(password|token|key|secret|api[_-]?key|auth|bearer|credential|private)$/i;

/**
 * Regex anchored to the resolved home plans directory path.
 * Constructed once at module load time using the OS home directory so that
 * only paths under ~/.config/opencode/plans/ trigger plan audit events, not any
 * project-local .opencode/plans/ directory.
 */
const PLAN_PATH_RE: RegExp = (() => {
  const plansDir = join(homedir(), ".config", "opencode", "plans");
  const escaped = escapeRegex(plansDir);
  return new RegExp(`^${escaped}[/\\\\][^/\\\\]+\\.md$`);
})();

/**
 * Deep-walk a plain object and replace the VALUE of any key whose name matches
 * SENSITIVE_FIELD_RE with "[REDACTED]".  Non-object leaves are kept as-is.
 */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_FIELD_RE.test(k) ? "[REDACTED]" : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }
  return value;
}

/**
 * Returns the JSONL file path for today's date, e.g.
 * ~/.local/share/opencode/audit/2024-06-11.jsonl
 */
function auditFilePath(): string {
  const today = new Date().toISOString().slice(0, 10);
  return join(homedir(), ".local", "share", "opencode", "audit", `${today}.jsonl`);
}

/**
 * Appends a single JSONL line to the audit file.
 * Creates the directory tree if it does not exist.
 * All errors are silently swallowed to keep the plugin non-blocking.
 */
async function appendAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const filePath = auditFilePath();
    const dir = dirname(filePath);

    await mkdir(dir, { recursive: true });

    const line = `${JSON.stringify({ ...entry, ts: entry.ts ?? new Date().toISOString() })}\n`;
    await appendFile(filePath, line, { encoding: "utf8" });
  } catch {
    return;
  }
}

/**
 * Reads plan frontmatter from a file path and returns id and status.
 * Returns null if the file cannot be read or has no frontmatter.
 */
async function readPlanFrontmatter(
  filePath: string,
): Promise<{ id: string; status: string } | null> {
  try {
    const content = await Bun.file(filePath).text();
    const id = extractFrontmatterField(content, "id");
    const status = extractFrontmatterField(content, "status");
    if (!id || !status) return null;
    return { id, status };
  } catch {
    return null;
  }
}

/** Per-session state accumulated in memory. */
interface SessionState {
  sessionId: string;
  model: string;
  agent: string;
  startedAt: number;
  filesModified: Set<string>;
  totalInputTokens: number;
  totalOutputTokens: number;
  knownPlanStatuses: Map<string, string>;
}

const sessionStateMap = new Map<string, SessionState>();

function getSession(sessionId: string): SessionState | undefined {
  return sessionStateMap.get(sessionId);
}

function createSession(sessionId: string, model: string, agent: string): SessionState {
  const entry: SessionState = {
    sessionId,
    model,
    agent,
    startedAt: Date.now(),
    filesModified: new Set(),
    totalInputTokens: 0,
    totalOutputTokens: 0,
    knownPlanStatuses: new Map(),
  };
  sessionStateMap.set(sessionId, entry);
  return entry;
}

function deleteSession(sessionId: string): void {
  sessionStateMap.delete(sessionId);
}

const toolStartTimestamps = new WeakMap<object, number>();

function recordToolStart(inputRef: object): void {
  toolStartTimestamps.set(inputRef, Date.now());
}

function consumeToolStart(inputRef: object): number | undefined {
  const startMs = toolStartTimestamps.get(inputRef);
  toolStartTimestamps.delete(inputRef);
  return startMs;
}

/**
 * Rough cost estimate (USD) based on a blended $/1M-token rate.
 * Real pricing varies by model; this gives a useful order-of-magnitude figure.
 */
const BLENDED_COST_PER_1M_INPUT = 3.0;
const BLENDED_COST_PER_1M_OUTPUT = 15.0;

export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * BLENDED_COST_PER_1M_INPUT +
    (outputTokens / 1_000_000) * BLENDED_COST_PER_1M_OUTPUT
  );
}

/** Allowlist of valid plan status values. Unlisted values are replaced with "unknown". */
const VALID_PLAN_STATUSES = new Set(["draft", "approved", "rejected", "in-progress", "done"]);

/** Maximum length for a plan ID written to the audit log. */
const MAX_PLAN_ID_LENGTH = 128;

/**
 * Sanitizes a raw plan ID extracted from frontmatter.
 * Rejects values containing characters outside alphanumerics, hyphens, and underscores.
 * Returns "[invalid-id]" when the value fails validation.
 */
export function sanitizePlanId(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_PLAN_ID_LENGTH);
  if (/^[\w-]+$/.test(trimmed)) return trimmed;
  return "[invalid-id]";
}

/**
 * Sanitizes a raw plan status extracted from frontmatter against a known allowlist.
 * Returns "unknown" when the value is not in the allowlist.
 */
export function sanitizePlanStatus(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  return VALID_PLAN_STATUSES.has(normalized) ? normalized : "unknown";
}

/**
 * Handles audit logging for plan artifact file writes.
 * Emits plan.created, plan.updated, and plan.approved events as appropriate.
 * Uses the event-provided `isNewFile` flag to determine creation semantics;
 * falls back to absence from the session's known-statuses map only when the
 * flag is explicitly true, avoiding false plan.created events for pre-existing files.
 */
async function auditPlanFileWrite(
  filePath: string,
  eventIsNew: boolean | undefined,
  session: SessionState,
): Promise<void> {
  const meta = await readPlanFrontmatter(filePath);
  if (!meta) return;

  const planId = sanitizePlanId(meta.id);
  const planStatus = sanitizePlanStatus(meta.status);
  const previousStatus = session.knownPlanStatuses.get(filePath);

  const isCreation = eventIsNew === true && previousStatus === undefined;
  const isUpdate = !isCreation && previousStatus !== undefined && previousStatus !== planStatus;

  if (isCreation) {
    void appendAuditEntry({
      ts: new Date().toISOString(),
      event: "plan.created",
      sessionId: session.sessionId,
      planId,
      planPath: filePath,
      planStatus,
    });
  } else if (isUpdate) {
    void appendAuditEntry({
      ts: new Date().toISOString(),
      event: "plan.updated",
      sessionId: session.sessionId,
      planId,
      planPath: filePath,
      planStatus,
    });

    if (planStatus === "approved") {
      void appendAuditEntry({
        ts: new Date().toISOString(),
        event: "plan.approved",
        sessionId: session.sessionId,
        planId,
        planPath: filePath,
        planStatus,
      });
    }
  }

  session.knownPlanStatuses.set(filePath, planStatus);
}

/**
 * Normalises a file path for log output by replacing the current user's home
 * directory prefix with `~`. Paths that do not start with the home directory
 * are returned unchanged.
 */
export function normalisePathForLog(filePath: string): string {
  const home = homedir();
  return filePath.startsWith(home) ? `~${filePath.slice(home.length)}` : filePath;
}

const auditLoggerPlugin: Plugin = async (_ctx) => {
  return {
    event: async (input) => {
      const ev = input.event as Record<string, unknown>;
      if (!ev || typeof ev !== "object") return;
      const type = ev.type as string | undefined;
      if (!type) return;

      if (type === "session.created") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const info = (properties.info ?? {}) as Record<string, unknown>;
        const sessionId = (info.id as string | undefined) ?? "unknown";
        const model = (info.model as string | undefined) ?? "unknown";
        const agent = (info.agent as string | undefined) ?? "build";

        const session = createSession(sessionId, model, agent);

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.start",
          sessionId: session.sessionId,
          model: session.model,
          agent: session.agent,
        });
        return;
      }

      if (type === "file.edited") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const path = properties.file as string | undefined;
        const sessionId = properties.sessionID as string | undefined;
        if (!path || !sessionId) return;

        const session = getSession(sessionId);
        if (!session) return;

        session.filesModified.add(path);

        if (PLAN_PATH_RE.test(path)) {
          const eventIsNew = properties.isNew as boolean | undefined;
          void auditPlanFileWrite(path, eventIsNew, session);
        }
        return;
      }

      if (type === "assistant.response" || type === "message.completed") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const sessionId = properties.sessionID as string | undefined;
        if (!sessionId) return;

        const session = getSession(sessionId);
        if (!session) return;

        const usage = properties.usage as Record<string, number> | undefined;
        if (usage) {
          session.totalInputTokens += usage.inputTokens ?? usage.input_tokens ?? 0;
          session.totalOutputTokens += usage.outputTokens ?? usage.output_tokens ?? 0;
        }
        return;
      }

      if (type === "session.idle") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const sessionId = properties.sessionID as string | undefined;
        if (!sessionId) return;

        const session = getSession(sessionId);
        if (!session) return;

        const totalTokens = session.totalInputTokens + session.totalOutputTokens;
        const costEstimateUsd = estimateCost(session.totalInputTokens, session.totalOutputTokens);

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.idle",
          sessionId: session.sessionId,
          totalTokens,
          costEstimateUsd: Math.round(costEstimateUsd * 100_000) / 100_000,
          filesModified: Array.from(session.filesModified).map(normalisePathForLog),
        });
        return;
      }

      if (type === "session.deleted" || type === "session.end") {
        const properties = (ev.properties ?? {}) as Record<string, unknown>;
        const info = (properties.info ?? {}) as Record<string, unknown>;
        const sessionId =
          (info.id as string | undefined) ?? (properties.sessionID as string | undefined);
        if (!sessionId) return;

        const session = getSession(sessionId);

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.end",
          sessionId: session?.sessionId ?? sessionId,
          totalDurationMs: session?.startedAt ? Date.now() - session.startedAt : undefined,
        });

        deleteSession(sessionId);
        return;
      }
    },

    "tool.execute.before": async (input, _output) => {
      try {
        recordToolStart(input as object);
      } catch {
        return;
      }
    },

    "tool.execute.after": async (input, output) => {
      try {
        const startMs = consumeToolStart(input as object);
        const rawArgs = { ...(input.args as Record<string, unknown>) };

        const sanitisedArgs = sanitize(rawArgs) as Record<string, unknown>;
        const durationMs = startMs !== undefined ? Date.now() - startMs : undefined;

        const result = output as Record<string, unknown>;
        const success = !result.error;
        const errorMsg = result.error ? String(result.error).slice(0, 300) : undefined;

        const sessionId = input.sessionID;
        const session = sessionId ? getSession(sessionId) : undefined;

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "tool.execute",
          sessionId: session?.sessionId ?? sessionId,
          tool: input.tool ?? "unknown",
          argsSummary: sanitisedArgs,
          durationMs,
          success,
          ...(errorMsg ? { error: errorMsg } : {}),
        });
      } catch {
        return;
      }
    },
  };
};

export default auditLoggerPlugin satisfies Plugin;
