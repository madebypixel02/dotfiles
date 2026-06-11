/**
 * audit-logger.ts — Enterprise Audit Logging Plugin
 *
 * Writes a JSONL audit trail to ~/.local/share/opencode/audit/YYYY-MM-DD.jsonl.
 * Every line is a self-contained JSON object (one per log entry).
 *
 * Logged events:
 *   session.start   — session ID, model, agent, ISO timestamp
 *   tool.execute    — tool name, sanitised args summary, duration (ms), success flag
 *   session.idle    — total tokens, cost estimate, files modified in the session
 *   session.end     — session ID, total duration, ISO timestamp
 *
 * Design principles:
 *   • Non-blocking: every async path is fire-and-forget; errors are swallowed.
 *   • Sanitisation: any arg field named password/token/key/secret/apiKey has
 *     its value replaced with "[REDACTED]" before logging.
 *   • Directory auto-creation: the audit directory is created if it does not exist.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { join } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  ts: string; // ISO-8601 timestamp
  event: string; // event discriminator
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fields whose values should never appear in logs. Case-insensitive match. */
const SENSITIVE_FIELD_RE =
  /^(password|token|key|secret|api[_-]?key|auth|bearer|credential|private)$/i;

/**
 * Deep-walk a plain object and replace the VALUE of any key whose name matches
 * SENSITIVE_FIELD_RE with "[REDACTED]".  Non-object leaves are kept as-is.
 */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_FIELD_RE.test(k)
        ? "[REDACTED]"
        : sanitize(v, depth + 1);
    }
    return out;
  }
  // Scalars: truncate very long strings to avoid bloating the log file
  if (typeof value === "string" && value.length > 500) {
    return value.slice(0, 500) + "…";
  }
  return value;
}

/**
 * Returns the JSONL file path for today's date, e.g.
 * ~/.local/share/opencode/audit/2024-06-11.jsonl
 */
function auditFilePath(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(
    homedir(),
    ".local",
    "share",
    "opencode",
    "audit",
    `${today}.jsonl`,
  );
}

/**
 * Appends a single JSONL line to the audit file.
 * Creates the directory tree if it does not exist.
 * All errors are silently swallowed to keep the plugin non-blocking.
 */
async function appendAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const filePath = auditFilePath();
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));

    // Bun: ensure directory exists
    await Bun.$`mkdir -p ${dir}`.quiet();

    const line =
      JSON.stringify({ ...entry, ts: entry.ts ?? new Date().toISOString() }) +
      "\n";
    await Bun.write(Bun.file(filePath), line, { append: true } as Parameters<
      typeof Bun.write
    >[2] & { append?: boolean });
  } catch {
    // Intentionally swallowed — audit failures must never crash the session
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/** Per-session state accumulated in memory. */
interface SessionState {
  sessionId: string;
  model: string;
  agent: string;
  startedAt: number;
  filesModified: Set<string>;
  totalInputTokens: number;
  totalOutputTokens: number;
}

const state: Partial<SessionState> = {};

/**
 * Rough cost estimate (USD) based on a blended $/1M-token rate.
 * Real pricing varies by model; this gives a useful order-of-magnitude figure.
 */
const BLENDED_COST_PER_1M_INPUT = 3.0;
const BLENDED_COST_PER_1M_OUTPUT = 15.0;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * BLENDED_COST_PER_1M_INPUT +
    (outputTokens / 1_000_000) * BLENDED_COST_PER_1M_OUTPUT
  );
}

const auditLoggerPlugin: Plugin = async ({}) => {
  return {
    // ------------------------------------------------------------------
    // Session lifecycle
    // ------------------------------------------------------------------
    event: async (input) => {
      const ev = input as Record<string, unknown>;
      const type = ev["type"] as string | undefined;
      if (!type) return;

      // ── session.created ───────────────────────────────────────────────
      if (type === "session.created") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        state.sessionId = (properties["id"] ??
          properties["sessionId"] ??
          "unknown") as string;
        state.model = (properties["model"] ?? "unknown") as string;
        state.agent = (properties["agent"] ?? "build") as string;
        state.startedAt = Date.now();
        state.filesModified = new Set();
        state.totalInputTokens = 0;
        state.totalOutputTokens = 0;

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.start",
          sessionId: state.sessionId,
          model: state.model,
          agent: state.agent,
        });
        return;
      }

      // ── file.edited (track modified files) ───────────────────────────
      if (type === "file.edited") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const path =
          (properties["path"] as string | undefined) ??
          (properties["file"] as string | undefined);
        if (path && state.filesModified) {
          state.filesModified.add(path);
        }
        return;
      }

      // ── token usage tracking ──────────────────────────────────────────
      if (type === "assistant.response" || type === "message.completed") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const usage = properties["usage"] as Record<string, number> | undefined;
        if (usage) {
          state.totalInputTokens =
            (state.totalInputTokens ?? 0) +
            (usage["inputTokens"] ?? usage["input_tokens"] ?? 0);
          state.totalOutputTokens =
            (state.totalOutputTokens ?? 0) +
            (usage["outputTokens"] ?? usage["output_tokens"] ?? 0);
        }
        return;
      }

      // ── session.idle ──────────────────────────────────────────────────
      if (type === "session.idle") {
        const totalTokens =
          (state.totalInputTokens ?? 0) + (state.totalOutputTokens ?? 0);
        const costEstimateUsd = estimateCost(
          state.totalInputTokens ?? 0,
          state.totalOutputTokens ?? 0,
        );

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.idle",
          sessionId: state.sessionId,
          totalTokens,
          costEstimateUsd: Math.round(costEstimateUsd * 100_000) / 100_000,
          filesModified: state.filesModified
            ? Array.from(state.filesModified)
            : [],
        });
        return;
      }

      // ── session.deleted / session.end ─────────────────────────────────
      if (type === "session.deleted" || type === "session.end") {
        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "session.end",
          sessionId: state.sessionId,
          totalDurationMs: state.startedAt
            ? Date.now() - state.startedAt
            : undefined,
        });
        return;
      }
    },

    // ------------------------------------------------------------------
    // Tool execution — before hook records start time
    // ------------------------------------------------------------------
    "tool.execute.before": async (input, output) => {
      try {
        // Attach start timestamp into the args so the after-hook can diff it.
        // We use a private sentinel key so it never conflicts with real args.
        (output.args as Record<string, unknown>)["__auditStartMs__"] =
          Date.now();
      } catch {
        // swallow
      }
    },

    // ------------------------------------------------------------------
    // Tool execution — after hook writes the full audit entry
    // ------------------------------------------------------------------
    "tool.execute.after": async (input, output) => {
      try {
        const rawArgs = { ...(input.args as Record<string, unknown>) };
        const startMs = rawArgs["__auditStartMs__"] as number | undefined;
        delete rawArgs["__auditStartMs__"];

        const sanitisedArgs = sanitize(rawArgs) as Record<string, unknown>;
        const durationMs =
          startMs !== undefined ? Date.now() - startMs : undefined;

        // Determine success: presence of error field means failure
        const result = output as Record<string, unknown>;
        const success = !result["error"];
        const errorMsg = result["error"]
          ? String(result["error"]).slice(0, 300)
          : undefined;

        void appendAuditEntry({
          ts: new Date().toISOString(),
          event: "tool.execute",
          sessionId: state.sessionId,
          tool: (input.tool as string | undefined) ?? "unknown",
          argsSummary: sanitisedArgs,
          durationMs,
          success,
          ...(errorMsg ? { error: errorMsg } : {}),
        });
      } catch {
        // swallow
      }
    },
  };
};

export default auditLoggerPlugin satisfies Plugin;
