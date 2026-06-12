---
applyTo: "**/*.md,**/*.mdx"
---

# Markdown Rules

These rules apply to all Markdown and MDX files. Follow them when creating new documents or modifying existing ones.

---

## 1. Linting

- All Markdown files must pass `markdownlint-cli2` with the project's `.markdownlint.jsonc` configuration.
- CI and pre-commit hooks enforce this check. Do not bypass them with `--no-verify`.
- Run `markdownlint-cli2 "**/*.md"` locally before committing any Markdown change.
- Fix all reported violations. Do not suppress rules inline unless the suppression is unavoidable and a comment on the same line explains why.

---

## 2. Indentation and Whitespace

- Use spaces for indentation. Hard tabs are forbidden in Markdown source, **except** inside fenced code blocks where the language requires them (Makefile recipe lines, for example).
- No trailing whitespace on any line.
- Every file must end with exactly one newline character. No blank lines at the end of the file.

---

## 3. Headings

- Use ATX-style headings (`#`, `##`, `###`). Setext-style underlines (`===`, `---`) are not permitted.
- Every heading must be preceded by a blank line and followed by a blank line, except when the heading is the first line of the file.
- Each file must contain exactly one `#` (h1) heading.
- Do not skip heading levels. Headings must descend sequentially: `#` → `##` → `###`. Going from `##` to `####` is a violation.

---

## 4. Lists

- Unordered lists use `-` as the marker. Do not use `*` or `+`.
- Ordered lists must use sequential numbers starting at `1`: `1.`, `2.`, `3.`. Do not repeat `1.` for every item.
- Nested list items are indented by two spaces relative to their parent marker.
- Add a blank line before and after a list when it is surrounded by paragraph text.

---

## 5. Code Blocks

- Use fenced code blocks with triple backticks. Indented code blocks are not permitted.
- Always specify a language identifier immediately after the opening backticks.

```bash
markdownlint-cli2 "**/*.md"
```

- Makefile code blocks must use real tab characters for recipe lines. The project's `.markdownlint.jsonc` sets `"MD010": { "code_blocks": false }` to allow this.
- Inline code uses single backticks. Use inline code for file names, command names, environment variable names, and short expressions.

---

## 6. Tables

- Tables must have a leading pipe and a trailing pipe on every row.
- Align column separator rows with dashes only: `| --- |`. Padding with colons for alignment in source is acceptable but not required.
- Every table must have a header row separated from the body by a delimiter row.

```md
| Name  | Type   | Required |
| ----- | ------ | -------- |
| id    | string | yes      |
| email | string | yes      |
```

---

## 7. Heading Hierarchy and Document Structure

- The `#` heading is the document title and appears once, at the top of the file.
- Use `##` for top-level sections, `###` for subsections within a section, and `####` sparingly for deeply nested content only when the structure genuinely requires it.
- Horizontal rules (`---`) may be used as section dividers below section headings. Do not use them as a substitute for headings.

---

## 8. File Naming

- Standalone Markdown documents use `kebab-case.md` (all lowercase, words separated by hyphens).
- Do not use spaces, underscores, or mixed case in file names unless an existing convention in the directory requires it.
- MDX files follow the same naming convention: `kebab-case.mdx`.

---

## 9. Links and References

- Use inline links for one-off references: `[label](url)`.
- Use reference-style links when the same URL appears more than once in a document.
- Link text must be descriptive. Do not use `click here`, `this link`, or bare URLs as link text.
- Bare URLs that are intentionally displayed as URLs must be wrapped in angle brackets: `<https://example.com>`.

---

## 10. Images

- Every image must have alt text: `![descriptive alt text](path/to/image.png)`.
- Alt text must describe the content or purpose of the image, not its file name.
- Do not embed images using HTML `<img>` tags unless Markdown syntax cannot achieve the required result (e.g., width control).
