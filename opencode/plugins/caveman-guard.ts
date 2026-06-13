/**
 * caveman-guard.ts — Caveman Mode Plugin
 *
 * Division of labor with the `/caveman` skill:
 *   - This plugin manages session-level state for caveman mode and exposes the
 *     `caveman_toggle` tool so the model (or user via slash command) can switch
 *     modes programmatically. It also provides light advisory behaviour: logging
 *     a notice when verbose echo/printf commands are issued while caveman mode is
 *     active. It does not enforce prose compression — that is the model's job.
 *   - The `/caveman` skill contains the full compression ruleset: intensity levels
 *     (lite, full, ultra), the specific grammar rules the model applies, the
 *     NOT vs YES examples, auto-clarity exception conditions, and the boundaries
 *     that never change (code blocks, commit messages, PR descriptions). The skill
 *     is loaded into context to instruct the model how to behave; this plugin
 *     tracks whether that behaviour should be active.
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
import { tool } from "@opencode-ai/plugin";

/** True when caveman communication mode is active. */
let caveman_active = false;

/** Current intensity level when caveman mode is on. */
let caveman_intensity: "lite" | "full" | "ultra" = "full";

/**
 * Returns true if the bash command is an echo or printf producing verbose
 * multi-word output that caveman mode would abbreviate.
 * Detection is intentionally narrow to avoid false positives.
 */
function isVerboseEchoCommand(command: string): boolean {
  const trimmed = command.trim();
  return /^(echo|printf)\s+['"]?.{40,}/.test(trimmed);
}

const cavemanGuardPlugin: Plugin = async (_ctx) => {
  return {
    event: async (input) => {
      try {
        const ev = input.event as Record<string, unknown>;
        if (!ev || typeof ev !== "object") return;
        const type = ev.type as string | undefined;
        if (!type) return;

        if (type === "session.created") {
          console.log(`\n[caveman] Mode: OFF. Activate: /caveman or type "caveman mode"\n`);
          caveman_active = false;
          caveman_intensity = "full";
          return;
        }
      } catch {
        return;
      }
    },

    "tool.execute.before": async (input, output) => {
      try {
        const toolName = input.tool ?? "";
        if (!/^(bash|Bash|shell|Shell)$/i.test(toolName)) return;
        if (!caveman_active) return;

        const args = (output.args ?? {}) as Record<string, unknown>;
        const command =
          (args.command as string | undefined) ?? (args.cmd as string | undefined) ?? "";

        if (isVerboseEchoCommand(command)) {
          console.log(
            `[caveman] Verbose echo detected. Caveman mode active (${caveman_intensity}).`,
          );
        }
      } catch {
        return;
      }
    },

    tool: {
      caveman_toggle: tool({
        description:
          "Toggle caveman communication mode on/off, or set intensity level (lite/full/ultra)",
        args: {
          action: tool.schema
            .enum(["on", "off", "lite", "full", "ultra"] as const)
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
    },
  };
};

export default cavemanGuardPlugin satisfies Plugin;
