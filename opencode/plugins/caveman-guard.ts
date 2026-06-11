/**
 * caveman-guard.ts — Caveman Mode Plugin
 *
 * Tracks whether caveman communication mode is active and exposes a
 * `caveman_toggle` tool so the model (or user via slash command) can
 * switch modes programmatically.
 *
 * Behaviour:
 *   - On session.created: logs current mode status with activation instructions.
 *   - On tool.execute.before for Bash tool: skips verbose echo/printf commands
 *     when caveman mode is active (advisory skip, not a hard block).
 *   - Exposes caveman_toggle tool: on/off/lite/full/ultra.
 *
 * Design principles:
 *   - Non-blocking: never throws, never prevents tool execution.
 *   - Module-level state: a single boolean tracks active status across hooks.
 *   - No external dependencies.
 */

import type { Plugin } from "@opencode-ai/plugin";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** True when caveman communication mode is active. */
let caveman_active = false;

/** Current intensity level when caveman mode is on. */
let caveman_intensity: "lite" | "full" | "ultra" = "full";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the bash command is an echo or printf producing verbose
 * multi-word output that caveman mode would abbreviate.
 * Detection is intentionally narrow to avoid false positives.
 */
function isVerboseEchoCommand(command: string): boolean {
  const trimmed = command.trim();
  // Match: echo "..." or printf "..." with more than ~40 chars of content
  return /^(echo|printf)\s+['"]?.{40,}/.test(trimmed);
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const cavemanGuardPlugin: Plugin = async ({ tool }) => {
  return {
    // ------------------------------------------------------------------
    // Session lifecycle
    // ------------------------------------------------------------------
    event: async (input) => {
      try {
        const ev = input as Record<string, unknown>;
        const type = ev["type"] as string | undefined;
        if (!type) return;

        if (type === "session.created") {
          console.log(
            `\n[caveman] Mode: OFF. Activate: /caveman or type "caveman mode"\n`,
          );
          // Reset state for new session
          caveman_active = false;
          caveman_intensity = "full";
          return;
        }
      } catch {
        // swallow
      }
    },

    // ------------------------------------------------------------------
    // Before Bash execution: skip verbose echo/printf in caveman mode
    // ------------------------------------------------------------------
    "tool.execute.before": async (input, _output) => {
      try {
        const toolName = (input.tool as string | undefined) ?? "";
        if (!/^(bash|Bash|shell|Shell)$/i.test(toolName)) return;
        if (!caveman_active) return;

        const args = (input.args ?? {}) as Record<string, unknown>;
        const command =
          (args["command"] as string | undefined) ??
          (args["cmd"] as string | undefined) ??
          "";

        if (isVerboseEchoCommand(command)) {
          // Advisory log only — does not cancel execution
          console.log(
            `[caveman] Verbose echo detected. Caveman mode active (${caveman_intensity}).`,
          );
        }
      } catch {
        // swallow
      }
    },

    // ------------------------------------------------------------------
    // Custom tool: caveman_toggle
    // ------------------------------------------------------------------
    tools: [
      tool({
        name: "caveman_toggle",
        description:
          "Toggle caveman communication mode on/off, or set intensity level (lite/full/ultra)",
        args: {
          action: tool.schema
            .enum(["on", "off", "lite", "full", "ultra"])
            .describe("Mode to set"),
        },
        async execute({ action }) {
          if (action === "off") {
            caveman_active = false;
            caveman_intensity = "full";
            return "Caveman mode OFF. Normal mode restored.";
          }

          caveman_active = true;

          if (action === "on") {
            caveman_intensity = "full";
          } else {
            caveman_intensity = action as "lite" | "full" | "ultra";
          }

          return `Caveman mode ON (${caveman_intensity}). Terse. No fluff. Code unchanged.`;
        },
      }),
    ],
  };
};

export default cavemanGuardPlugin satisfies Plugin;
