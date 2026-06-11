/**
 * secret-guard.ts — Advanced Secrets Protection Plugin
 *
 * Two layers of defence:
 *
 * 1. PATH BLOCKING — Intercepts read/write/edit tool calls whose target path
 *    matches known sensitive file patterns and throws a descriptive error.
 *
 * 2. CONTENT SCANNING — Scans the content of write/edit calls for patterns that
 *    look like hardcoded secrets (AWS keys, PEM headers, tokens, etc.) and
 *    blocks the write with a remediation hint.
 *
 * 3. BASH COMMAND SCANNING — Scans bash commands for patterns that would print
 *    secret values (printenv, cat .env, echo $SECRET, etc.) while allowing
 *    safe "existence check" patterns.
 *
 * All blocks throw an Error with a message that:
 *   - Names what was blocked
 *   - Explains WHY it is sensitive
 *   - Suggests a concrete remediation step
 *
 * Design notes:
 *   • Non-blocking for allowed operations (no unnecessary overhead).
 *   • Regex patterns are compiled once at module load time.
 *   • Errors thrown in before-hooks abort the tool call cleanly.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { basename } from "path";

// ---------------------------------------------------------------------------
// Blocked path patterns
// ---------------------------------------------------------------------------

/**
 * Glob-style patterns for sensitive file paths.
 * Matched against the resolved basename and the full path string.
 */
const BLOCKED_PATH_PATTERNS: RegExp[] = [
  // dotenv files
  /^\.env$/,
  /^\.env\..+/, // .env.local, .env.production, etc.
  // certificates & private keys
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa$/,
  /^id_ed25519$/,
  /^id_ecdsa$/,
  /^id_dsa$/,
  // credential / secret config files
  /^credentials\.json$/i,
  /^secrets\.ya?ml$/i,
  /\.secret$/i,
  /^\.netrc$/,
  /^\.pgpass$/,
  // cloud provider auth files
  /^credentials$/, // AWS ~/.aws/credentials
  /^config$/, // may catch too broadly — checked alongside path
  /^service[_-]account\.json$/i,
  // SSH directory
  /authorized_keys$/,
  /known_hosts$/,
  // GPG
  /\.gpg$/i,
  /\.asc$/i,
  // macOS keychain exports
  /\.p12$/i,
  /\.pfx$/i,
];

/** Path fragments that elevate a generic filename to "definitely sensitive" */
const SENSITIVE_PATH_FRAGMENTS = [
  "/.aws/",
  "/.ssh/",
  "/.gnupg/",
  "/.config/gcloud",
  "/vault/",
  "/.kube/",
];

function isBlockedPath(filePath: string): { blocked: boolean; reason: string } {
  const name = basename(filePath);

  for (const re of BLOCKED_PATH_PATTERNS) {
    if (re.test(name)) {
      return {
        blocked: true,
        reason: `File "${name}" matches sensitive file pattern (${re.source})`,
      };
    }
  }

  // Check for sensitive directory context even if filename looks innocent
  for (const fragment of SENSITIVE_PATH_FRAGMENTS) {
    if (filePath.includes(fragment)) {
      return {
        blocked: true,
        reason: `Path "${filePath}" is inside a sensitive directory (${fragment.trim()})`,
      };
    }
  }

  return { blocked: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Bash command scanning
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate a command is PRINTING/EXPORTING secret values.
 * A match causes the command to be blocked UNLESS isSafeByAllowlist passes first.
 *
 * Distinction enforced here:
 *   BLOCKED — commands that read secret *values* from .env files or the environment
 *   ALLOWED — commands that read only key *names* (safe for code generation context)
 *
 * Safe key-name-only commands (handled by SAFE_BASH_PATTERNS allowlist):
 *   grep -o "^[^=]*" .env      → prints KEY names only, no values
 *   cut -d= -f1 .env           → same
 *   sed 's/=.*//' .env         → same
 *   awk -F= '{print $1}' .env  → same
 */
const DANGEROUS_BASH_PATTERNS: Array<{ re: RegExp; description: string }> = [
  {
    re: /\bcat\s+\.env\b/,
    description: "cat .env — prints all environment variable values",
  },
  {
    re: /\bcat\s+\.env\.\w/,
    description: "cat .env.* — prints all environment variable values from a dotenv variant",
  },
  {
    re: /\bgrep\b.*\.env\b(?!.*-o.*\^\[)/,
    description: "grep against .env file — may print secret values; use 'grep -o \"^[^=]*\" .env' to list key names only",
    // Note: the allowlist exempts key-name-only grep patterns before this fires
  },
  {
    re: /\bprintenv\b(?!\s+\w)/,
    description: "printenv with no arguments — dumps all environment variable values",
  },
  {
    re: /\benv\s*\|\s*grep\b/,
    description: "env | grep — filters and prints environment variable values",
  },
  {
    re: /\benv\s*>\s*\S/,
    description: "env > file — redirects all env var values to a file",
  },
  {
    re: /\becho\s+\$(?:PASSWORD|SECRET|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|AWS_SECRET|DATABASE_URL)\b/i,
    description: "echo $SECRET_VAR — prints a secret variable value directly",
  },
  {
    re: /\bset\s*\|\s*grep\b/,
    description: "set | grep — dumps and filters shell variable values",
  },
  {
    re: /aws\s+configure\s+get\s+aws_secret/i,
    description: "aws configure get aws_secret_access_key — retrieves AWS secret value",
  },
  {
    re: /\bkubectl\s+get\s+secret\b.*-o\s+(?:json|yaml)/i,
    description: "kubectl get secret -o yaml/json — decodes Kubernetes secret values",
  },
  {
    re: /\bdocker\s+inspect\b.*secret/i,
    description: "docker inspect — may expose secret values in container config",
  },
  {
    re: /\bhistory\b\s*\|\s*grep\b/,
    description: "history | grep — may expose secret values from command history",
  },
  {
    re: /\bcat\s+~\/\.netrc\b/,
    description: "cat ~/.netrc — prints stored credential values",
  },
  {
    re: /\bcat\s+~\/\.pgpass\b/,
    description: "cat ~/.pgpass — prints PostgreSQL password values",
  },
];

/**
 * Commands that match DANGEROUS_BASH_PATTERNS superficially but are safe because
 * they only expose key *names*, never values. Checked before the dangerous list.
 *
 * All of these strip the value portion (everything after the = sign) before output:
 *   grep -o "^[^=]*" .env      → KEY_NAME only
 *   grep -oP "^[^=]+" .env     → KEY_NAME only (Perl regex variant)
 *   cut -d= -f1 .env           → KEY_NAME only
 *   sed 's/=.*//' .env         → KEY_NAME only
 *   awk -F= '{print $1}' .env  → KEY_NAME only
 */
const SAFE_BASH_PATTERNS: RegExp[] = [
  // Key-name-only reads from .env — safe for generating process.env.VAR_NAME references
  /grep\s+-[a-zA-Z]*o[a-zA-Z]*\s+"?\^?\[?\^=\]?\*"?\s+\.env/,   // grep -o "^[^=]*" .env
  /grep\s+-[a-zA-Z]*oP[a-zA-Z]*\s+"?\^?\[?\^=\]\+"?\s+\.env/,   // grep -oP "^[^=]+" .env
  /cut\s+-d=?\s+-f1\s+\.env/,                                      // cut -d= -f1 .env
  /sed\s+'s\/=.*\/\/'\s+\.env/,                                    // sed 's/=.*//' .env
  /awk\s+['"-]F=.*print\s+\$1.*\.env/,                            // awk -F= '{print $1}' .env
  // Existence checks — never print values
  /\[\s*-z\s+"\$\w+"\s*\]/,
  /\[\s*-n\s+"\$\w+"\s*\]/,
  /\[\[\s*-z\s+"\$\w+"\s*\]\]/,
  /\[\[\s*-n\s+"\$\w+"\s*\]\]/,
  // printenv VAR_NAME — checks a single named variable (exits non-zero if unset, prints nothing sensitive in scripts)
  /printenv\s+\w+\s*(?:&&|\|\||;|$)/,
  // env used only to pass variables to a subprocess, not to dump them
  /\benv\s+\w+=\S+\s+\w+/,
];

function isSafeByAllowlist(command: string): boolean {
  return SAFE_BASH_PATTERNS.some((re) => re.test(command));
}

function checkBashCommand(command: string): {
  blocked: boolean;
  reason: string;
} {
  if (isSafeByAllowlist(command)) {
    return { blocked: false, reason: "" };
  }

  for (const { re, description } of DANGEROUS_BASH_PATTERNS) {
    if (re.test(command)) {
      return { blocked: true, reason: description };
    }
  }

  return { blocked: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Content scanning (write / edit)
// ---------------------------------------------------------------------------

/**
 * Patterns that suggest hardcoded secrets inside file content.
 * Ordered from most specific (least false-positive risk) to broadest.
 */
const HARDCODED_SECRET_PATTERNS: Array<{ re: RegExp; description: string }> = [
  {
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    description: "PEM private key block detected",
  },
  {
    re: /-----BEGIN CERTIFICATE-----/,
    description:
      "PEM certificate block detected (may contain sensitive material)",
  },
  {
    re: /(?:AKIA|ASIA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    description: "AWS Access Key ID pattern detected (AKIA…)",
  },
  {
    re: /aws_secret_access_key\s*[=:]\s*["']?[A-Za-z0-9/+]{40}["']?/i,
    description: "AWS Secret Access Key assignment detected",
  },
  {
    re: /\b(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']/i,
    description: "Hardcoded password assignment detected",
  },
  {
    re: /\b(?:api[_-]?key|apikey)\s*[=:]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    description: "Hardcoded API key assignment detected",
  },
  {
    re: /\b(?:secret|token)\s*[=:]\s*["'][A-Za-z0-9_\-\.]{16,}["']/i,
    description: "Hardcoded secret/token assignment detected",
  },
  {
    re: /ghp_[A-Za-z0-9]{36}/,
    description: "GitHub Personal Access Token detected (ghp_…)",
  },
  {
    re: /ghs_[A-Za-z0-9]{36}/,
    description: "GitHub App Secret detected (ghs_…)",
  },
  {
    re: /sk-[A-Za-z0-9]{48}/,
    description: "OpenAI secret key detected (sk-…)",
  },
  {
    re: /xoxb-[A-Za-z0-9\-]+/,
    description: "Slack Bot Token detected (xoxb-…)",
  },
  {
    re: /xoxp-[A-Za-z0-9\-]+/,
    description: "Slack User Token detected (xoxp-…)",
  },
  {
    re: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/,
    description: "SendGrid API key detected",
  },
  {
    re: /(?:^|\n)\s*private_key\s*[:=]\s*"-----BEGIN/m,
    description: "Service account private key field detected",
  },
  {
    re: /(?:mongodb(?:\+srv)?:\/\/)(?:[^:]+):([^@]+)@/,
    description: "MongoDB connection string with embedded credentials detected",
  },
  {
    re: /postgres(?:ql)?:\/\/[^:]+:[^@]{6,}@/i,
    description: "PostgreSQL connection string with embedded password detected",
  },
];

function scanContentForSecrets(content: string): {
  found: boolean;
  description: string;
} {
  for (const { re, description } of HARDCODED_SECRET_PATTERNS) {
    if (re.test(content)) {
      return { found: true, description };
    }
  }
  return { found: false, description: "" };
}

// ---------------------------------------------------------------------------
// Remediation hints
// ---------------------------------------------------------------------------

function pathRemediationHint(filePath: string): string {
  return (
    `\n\nRemediation:\n` +
    `  • Use environment variables or a secrets manager (e.g., Vault, AWS Secrets Manager).\n` +
    `  • If you need to inspect "${basename(filePath)}" for debugging, do so in a terminal outside opencode.\n` +
    `  • Never commit secret files to version control; add them to .gitignore.`
  );
}

function bashRemediationHint(reason: string): string {
  return (
    `\n\nReason: ${reason}\n\n` +
    `Remediation:\n` +
    `  • To check if a variable is set, use: [ -n "$VAR" ] && echo "set" || echo "not set"\n` +
    `  • To pass variables to a process, use: VAR=value command args\n` +
    `  • Never print secret values in a shell command — they appear in logs and shell history.`
  );
}

function contentRemediationHint(description: string): string {
  return (
    `\n\nDetected: ${description}\n\n` +
    `Remediation:\n` +
    `  • Move the secret to an environment variable: process.env.MY_SECRET\n` +
    `  • Use a .env file (git-ignored) loaded at runtime via dotenv.\n` +
    `  • For long-lived credentials, use a secrets manager.\n` +
    `  • If this is test/example data, use clearly fake values (e.g., "EXAMPLE_KEY_DO_NOT_USE").`
  );
}

// ---------------------------------------------------------------------------
// Tool name helpers
// ---------------------------------------------------------------------------

/** Tools that READ file content */
const READ_TOOLS = new Set(["read", "Read", "readFile", "read_file"]);
/** Tools that WRITE / MODIFY file content */
const WRITE_TOOLS = new Set([
  "write",
  "Write",
  "edit",
  "Edit",
  "writeFile",
  "write_file",
  "editFile",
  "edit_file",
]);
/** Bash execution tools */
const BASH_TOOLS = new Set([
  "bash",
  "Bash",
  "shell",
  "Shell",
  "execute",
  "run",
]);

function extractFilePath(args: Record<string, unknown>): string | undefined {
  return (
    (args["filePath"] as string | undefined) ??
    (args["path"] as string | undefined) ??
    (args["file"] as string | undefined) ??
    (args["filename"] as string | undefined)
  );
}

function extractContent(args: Record<string, unknown>): string | undefined {
  return (
    (args["content"] as string | undefined) ??
    (args["newString"] as string | undefined) ??
    (args["text"] as string | undefined)
  );
}

function extractCommand(args: Record<string, unknown>): string | undefined {
  return (
    (args["command"] as string | undefined) ??
    (args["cmd"] as string | undefined) ??
    (args["script"] as string | undefined)
  );
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const secretGuardPlugin: Plugin = async ({}) => {
  return {
    "tool.execute.before": async (input, _output) => {
      const toolName = (input.tool as string | undefined) ?? "";
      const args = (input.args ?? {}) as Record<string, unknown>;

      // ── 1. Block reads of sensitive files ──────────────────────────────
      if (READ_TOOLS.has(toolName)) {
        const filePath = extractFilePath(args);
        if (filePath) {
          const { blocked, reason } = isBlockedPath(filePath);
          if (blocked) {
            throw new Error(
              `[SecretGuard] READ BLOCKED — ${reason}` +
                pathRemediationHint(filePath),
            );
          }
        }
      }

      // ── 2. Block writes/edits of sensitive files and scan content ──────
      if (WRITE_TOOLS.has(toolName)) {
        const filePath = extractFilePath(args);

        if (filePath) {
          const { blocked, reason } = isBlockedPath(filePath);
          if (blocked) {
            throw new Error(
              `[SecretGuard] WRITE BLOCKED — ${reason}` +
                pathRemediationHint(filePath),
            );
          }
        }

        // Scan content for embedded secrets regardless of filename
        const content = extractContent(args);
        if (content) {
          const { found, description } = scanContentForSecrets(content);
          if (found) {
            throw new Error(
              `[SecretGuard] CONTENT BLOCKED — Potential hardcoded secret detected in write content.` +
                contentRemediationHint(description),
            );
          }
        }
      }

      // ── 3. Scan bash commands ──────────────────────────────────────────
      if (BASH_TOOLS.has(toolName)) {
        const command = extractCommand(args);
        if (command) {
          const { blocked, reason } = checkBashCommand(command);
          if (blocked) {
            throw new Error(
              `[SecretGuard] BASH BLOCKED — Command may expose secret values.` +
                bashRemediationHint(reason),
            );
          }
        }
      }
    },
  };
};

export default secretGuardPlugin satisfies Plugin;
