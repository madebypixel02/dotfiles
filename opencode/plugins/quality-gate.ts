/**
 * quality-gate.ts — Quality Gate Plugin (notifications disabled)
 *
 * This plugin previously emitted test-coverage nudges and missing-test hints
 * via TUI toasts and a log file. All notifications have been removed per user
 * preference. The plugin is retained as a no-op stub so the opencode.jsonc
 * plugin array does not reference a missing file.
 *
 * To re-enable quality gate notifications, restore from git history.
 */

import type { Plugin } from "@opencode-ai/plugin";

const qualityGatePlugin: Plugin = async () => {
  return {};
};

export default qualityGatePlugin satisfies Plugin;
