/**
 * notification-hub.ts — Cross-Platform Desktop & Webhook Notification Plugin
 *
 * Delivers notifications across platforms and integrations:
 *
 * Platforms (auto-detected, best-effort):
 *   • macOS         — osascript AppleScript notification
 *   • Linux (X11)   — notify-send
 *   • WSL           — PowerShell MessageBox via /mnt/c/Windows/…
 *   • Windows       — PowerShell BurntToast / fallback balloon
 *
 * Integrations:
 *   • Slack / Teams / Discord / generic webhook
 *     Set OPENCODE_WEBHOOK_URL to enable.
 *     Optional: OPENCODE_WEBHOOK_TYPE = "slack" | "teams" | "discord" | "generic"
 *
 * Triggered on:
 *   session.idle    — summary notification (files changed, duration)
 *   session.error   — urgent error notification
 *   Long sessions   — "still working" ping every 10 minutes
 *
 * All operations are non-blocking. Errors are swallowed silently.
 *
 * Environment variables:
 *   OPENCODE_WEBHOOK_URL   — Webhook endpoint URL (optional)
 *   OPENCODE_WEBHOOK_TYPE  — "slack" | "teams" | "discord" | "generic" (default: generic)
 *   OPENCODE_NOTIFY_SILENT — Set to "1" to suppress desktop notifications
 */

import type { Plugin } from "@opencode-ai/plugin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "macos" | "linux" | "wsl" | "windows" | "unknown";
type WebhookType = "slack" | "teams" | "discord" | "generic";

interface NotificationPayload {
  title: string;
  body: string;
  urgent?: boolean;
}

interface WebhookBody {
  sessionId: string;
  status: "idle" | "error" | "progress";
  filesModifiedCount: number;
  durationMinutes: number;
  model: string;
  summaryExcerpt: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

let sessionId = "unknown";
let sessionModel = "unknown";
let sessionAgent = "unknown";
let sessionStartMs = 0;
let filesModifiedCount = 0;
let lastSummaryExcerpt = "";
let longSessionIntervalHandle: ReturnType<typeof setInterval> | null = null;
let LONG_SESSION_INTERVAL_MS = 10 * 60 * 1_000; // 10 minutes

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

function detectPlatform(): Platform {
  const platform = process.platform;

  if (platform === "darwin") return "macos";

  if (platform === "linux") {
    // Check for WSL
    try {
      const osRelease = Bun.file("/proc/sys/kernel/osrelease");
      // Synchronous read is acceptable here — detection only, done once
      // We use a flag check instead of sync file read for Bun compatibility
    } catch {
      // ignore
    }
    // Check WSL environment variable set by WSL itself
    if (process.env["WSL_DISTRO_NAME"] || process.env["WSLENV"]) return "wsl";
    return "linux";
  }

  if (platform === "win32") return "windows";

  return "unknown";
}

const PLATFORM = detectPlatform();

// ---------------------------------------------------------------------------
// Desktop notification senders
// ---------------------------------------------------------------------------

async function notifyMacOS(payload: NotificationPayload): Promise<void> {
  const { title, body, urgent = false } = payload;
  const sound = urgent ? "Sosumi" : "default";
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedBody = body.replace(/"/g, '\\"');
  const script = `display notification "${escapedBody}" with title "${escapedTitle}" sound name "${sound}"`;
  await Bun.$`osascript -e ${script}`.quiet();
}

async function notifyLinux(payload: NotificationPayload): Promise<void> {
  const { title, body, urgent = false } = payload;
  const urgencyFlag = urgent ? "--urgency=critical" : "--urgency=normal";
  const icon = urgent ? "dialog-error" : "dialog-information";
  await Bun.$`notify-send ${urgencyFlag} --icon=${icon} ${title} ${body}`.quiet();
}

async function notifyWSL(payload: NotificationPayload): Promise<void> {
  const { title, body } = payload;
  const ps = `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
  const script = `[System.Windows.Forms.MessageBox]::Show('${body.replace(/'/g, "''")}','${title.replace(/'/g, "''")}') | Out-Null`;
  await Bun.$`${ps} -Command "Add-Type -AssemblyName System.Windows.Forms; ${script}"`.quiet();
}

async function notifyWindows(payload: NotificationPayload): Promise<void> {
  const { title, body } = payload;
  // Attempt BurntToast, fall back to balloon via Shell.Application
  const script = [
    `$ErrorActionPreference = 'SilentlyContinue'`,
    `if (Get-Module -ListAvailable -Name BurntToast) {`,
    `  Import-Module BurntToast`,
    `  New-BurntToastNotification -Text '${title.replace(/'/g, "''")}','${body.replace(/'/g, "''")}' -Silent`,
    `} else {`,
    `  Add-Type -AssemblyName System.Windows.Forms`,
    `  $n = New-Object System.Windows.Forms.NotifyIcon`,
    `  $n.Icon = [System.Drawing.SystemIcons]::Information`,
    `  $n.Visible = $true`,
    `  $n.ShowBalloonTip(5000,'${title.replace(/'/g, "''")}','${body.replace(/'/g, "''")}',0)`,
    `  Start-Sleep -s 6`,
    `  $n.Dispose()`,
    `}`,
  ].join("; ");
  await Bun.$`powershell.exe -NoProfile -NonInteractive -Command ${script}`.quiet();
}

/**
 * Sends a desktop notification appropriate for the current platform.
 * Silently ignored if OPENCODE_NOTIFY_SILENT=1.
 */
async function sendDesktopNotification(
  payload: NotificationPayload,
): Promise<void> {
  if (process.env["OPENCODE_NOTIFY_SILENT"] === "1") return;

  try {
    switch (PLATFORM) {
      case "macos":
        await notifyMacOS(payload);
        break;
      case "linux":
        await notifyLinux(payload);
        break;
      case "wsl":
        await notifyWSL(payload);
        break;
      case "windows":
        await notifyWindows(payload);
        break;
      default:
        // Fallback: console log so there's always some output
        console.log(`[notification-hub] ${payload.title}: ${payload.body}`);
    }
  } catch {
    // Swallow — notification failure must never affect the session
  }
}

// ---------------------------------------------------------------------------
// Webhook senders
// ---------------------------------------------------------------------------

function buildSlackPayload(webhookBody: WebhookBody): Record<string, unknown> {
  const statusEmoji =
    webhookBody.status === "error"
      ? "🔴"
      : webhookBody.status === "progress"
        ? "🟡"
        : "🟢";
  return {
    text: `${statusEmoji} OpenCode Session Update`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${statusEmoji} OpenCode — ${webhookBody.status.toUpperCase()}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Session ID:*\n\`${webhookBody.sessionId}\``,
          },
          { type: "mrkdwn", text: `*Model:*\n${webhookBody.model}` },
          {
            type: "mrkdwn",
            text: `*Files Modified:*\n${webhookBody.filesModifiedCount}`,
          },
          {
            type: "mrkdwn",
            text: `*Duration:*\n${webhookBody.durationMinutes} min`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Summary:*\n${webhookBody.summaryExcerpt}`,
        },
      },
    ],
  };
}

function buildTeamsPayload(webhookBody: WebhookBody): Record<string, unknown> {
  const statusColor =
    webhookBody.status === "error"
      ? "FF0000"
      : webhookBody.status === "progress"
        ? "FFA500"
        : "00AA00";
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: statusColor,
    summary: `OpenCode ${webhookBody.status}`,
    sections: [
      {
        activityTitle: `OpenCode Session — ${webhookBody.status.toUpperCase()}`,
        activitySubtitle: `Session: ${webhookBody.sessionId}`,
        facts: [
          { name: "Model", value: webhookBody.model },
          {
            name: "Files Modified",
            value: String(webhookBody.filesModifiedCount),
          },
          { name: "Duration", value: `${webhookBody.durationMinutes} min` },
          { name: "Timestamp", value: webhookBody.timestamp },
        ],
        text: webhookBody.summaryExcerpt,
      },
    ],
  };
}

function buildDiscordPayload(
  webhookBody: WebhookBody,
): Record<string, unknown> {
  const color =
    webhookBody.status === "error"
      ? 0xff0000
      : webhookBody.status === "progress"
        ? 0xffa500
        : 0x00aa00;
  return {
    embeds: [
      {
        title: `OpenCode — ${webhookBody.status.toUpperCase()}`,
        color,
        fields: [
          {
            name: "Session",
            value: `\`${webhookBody.sessionId}\``,
            inline: true,
          },
          { name: "Model", value: webhookBody.model, inline: true },
          {
            name: "Files Modified",
            value: String(webhookBody.filesModifiedCount),
            inline: true,
          },
          {
            name: "Duration",
            value: `${webhookBody.durationMinutes} min`,
            inline: true,
          },
        ],
        description: webhookBody.summaryExcerpt,
        timestamp: webhookBody.timestamp,
      },
    ],
  };
}

function buildGenericPayload(
  webhookBody: WebhookBody,
): Record<string, unknown> {
  return { ...webhookBody };
}

async function sendWebhookNotification(
  webhookBody: WebhookBody,
): Promise<void> {
  const url = process.env["OPENCODE_WEBHOOK_URL"];
  if (!url) return;

  const type = (process.env["OPENCODE_WEBHOOK_TYPE"] ??
    "generic") as WebhookType;

  let payload: Record<string, unknown>;
  switch (type) {
    case "slack":
      payload = buildSlackPayload(webhookBody);
      break;
    case "teams":
      payload = buildTeamsPayload(webhookBody);
      break;
    case "discord":
      payload = buildDiscordPayload(webhookBody);
      break;
    default:
      payload = buildGenericPayload(webhookBody);
      break;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Swallow — webhook failure must never affect the session
  }
}

// ---------------------------------------------------------------------------
// High-level notification dispatchers
// ---------------------------------------------------------------------------

function elapsedMinutes(): number {
  if (!sessionStartMs) return 0;
  return Math.round((Date.now() - sessionStartMs) / 60_000);
}

async function dispatchIdleNotification(): Promise<void> {
  const duration = elapsedMinutes();
  const title = "OpenCode — Session Complete";
  const body =
    `${filesModifiedCount} file${filesModifiedCount !== 1 ? "s" : ""} modified • ` +
    `${duration} minute${duration !== 1 ? "s" : ""} elapsed`;

  await Promise.all([
    sendDesktopNotification({ title, body }),
    sendWebhookNotification({
      sessionId,
      status: "idle",
      filesModifiedCount,
      durationMinutes: duration,
      model: sessionModel,
      summaryExcerpt: lastSummaryExcerpt || body,
      timestamp: new Date().toISOString(),
    }),
  ]);
}

async function dispatchErrorNotification(errorType: string): Promise<void> {
  const duration = elapsedMinutes();
  const title = "OpenCode — Session Error ⚠️";
  const body = `Error: ${errorType} • After ${duration} min • ${filesModifiedCount} files modified`;

  await Promise.all([
    sendDesktopNotification({ title, body, urgent: true }),
    sendWebhookNotification({
      sessionId,
      status: "error",
      filesModifiedCount,
      durationMinutes: duration,
      model: sessionModel,
      summaryExcerpt: `Error: ${errorType}`,
      timestamp: new Date().toISOString(),
    }),
  ]);
}

async function dispatchProgressNotification(): Promise<void> {
  const duration = elapsedMinutes();
  const title = "OpenCode — Still Working";
  const body = `${duration} min elapsed • ${filesModifiedCount} file${filesModifiedCount !== 1 ? "s" : ""} modified so far`;

  await Promise.all([
    sendDesktopNotification({ title, body }),
    sendWebhookNotification({
      sessionId,
      status: "progress",
      filesModifiedCount,
      durationMinutes: duration,
      model: sessionModel,
      summaryExcerpt: body,
      timestamp: new Date().toISOString(),
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Long-session interval management
// ---------------------------------------------------------------------------

function startLongSessionPing(): void {
  if (longSessionIntervalHandle) return; // already running

  longSessionIntervalHandle = setInterval(() => {
    const elapsed = elapsedMinutes();
    if (elapsed < 10) return; // Don't ping before 10 min even if interval fires early
    void dispatchProgressNotification();
  }, LONG_SESSION_INTERVAL_MS);

  // Prevent the interval from blocking process exit
  if (
    longSessionIntervalHandle &&
    typeof longSessionIntervalHandle === "object"
  ) {
    const handle = longSessionIntervalHandle as NodeJS.Timeout;
    if (typeof handle.unref === "function") handle.unref();
  }
}

function stopLongSessionPing(): void {
  if (longSessionIntervalHandle) {
    clearInterval(longSessionIntervalHandle);
    longSessionIntervalHandle = null;
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const notificationHubPlugin: Plugin = async ({}) => {
  return {
    event: async (input) => {
      const ev = input as Record<string, unknown>;
      const type = ev["type"] as string | undefined;
      if (!type) return;

      // ── session.created ────────────────────────────────────────────
      if (type === "session.created") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        sessionId = (properties["id"] ??
          properties["sessionId"] ??
          "unknown") as string;
        sessionModel = (properties["model"] ?? "unknown") as string;
        sessionAgent = (properties["agent"] ?? "build") as string;
        sessionStartMs = Date.now();
        filesModifiedCount = 0;
        lastSummaryExcerpt = "";
        startLongSessionPing();
        return;
      }

      // ── file.edited ────────────────────────────────────────────────
      if (type === "file.edited") {
        filesModifiedCount++;
        return;
      }

      // ── Track assistant message summaries ──────────────────────────
      if (type === "assistant.message" || type === "message.completed") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const content = properties["content"] as string | undefined;
        if (content) {
          // Keep the last 200 chars of assistant output as the summary excerpt
          lastSummaryExcerpt =
            content.length > 200 ? "…" + content.slice(-200) : content;
        }
        return;
      }

      // ── session.idle ───────────────────────────────────────────────
      if (type === "session.idle") {
        void dispatchIdleNotification();
        return;
      }

      // ── session.error ──────────────────────────────────────────────
      if (type === "session.error") {
        const properties = (ev["properties"] ?? ev) as Record<string, unknown>;
        const errorType =
          (properties["errorType"] as string | undefined) ??
          (properties["error"] as string | undefined) ??
          "Unknown Error";
        void dispatchErrorNotification(errorType);
        return;
      }

      // ── session.deleted / end ──────────────────────────────────────
      if (type === "session.deleted" || type === "session.end") {
        stopLongSessionPing();
        return;
      }
    },
  };
};

export default notificationHubPlugin satisfies Plugin;
