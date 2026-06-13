/**
 * frontmatter.ts — Shared YAML frontmatter parsing utilities.
 *
 * Used by audit-logger.ts and context-injector.ts to extract field values
 * from plan artifact files that begin with a YAML frontmatter block.
 *
 * The dynamic RegExp in extractFrontmatterField is intentional: the field
 * argument is always a hardcoded string literal at every call site (e.g.
 * "id", "status", "updated_at"), and its value is passed through escapeRegex
 * before interpolation, eliminating any injection risk.
 */

/**
 * Escapes all regex metacharacters in a string so it can be safely used
 * inside a RegExp constructor without altering its literal meaning.
 */
export function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts a single frontmatter field value from a YAML frontmatter block.
 * Returns null if the field is absent or the file does not begin with `---`.
 */
export function extractFrontmatterField(content: string, field: string): string | null {
  if (!content.startsWith("---")) return null;
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const pattern = new RegExp(`^${escapeRegex(field)}:\\s*(.+)$`, "m");
  const match = content.match(pattern);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}
