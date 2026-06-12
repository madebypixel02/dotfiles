# Markdown Rules

Apply these rules whenever writing, editing, or reviewing any Markdown file in this repository.

---

## Linting

All Markdown files must pass `markdownlint-cli2` using the project's `.markdownlint.jsonc` configuration. CI runs this check on every push and every merge request. Pre-commit hooks enforce it locally before any commit reaches the remote.

Run the linter manually with:

```
markdownlint-cli2 "**/*.md"
```

Do not suppress lint failures with inline `<!-- markdownlint-disable -->` comments unless no conforming alternative exists. When suppression is unavoidable, add a docstring-style comment block immediately above the suppressed section explaining why the rule cannot be satisfied.

---

## Active Rule Configuration

The project's `.markdownlint.jsonc` controls which rules are enforced and which are relaxed. The table below documents every non-default setting.

| Rule  | Setting                    | Effect                                                                                                          |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| MD010 | `{ "code_blocks": false }` | Hard tabs are flagged in prose but permitted inside fenced code blocks (required for Makefile recipe lines)     |
| MD013 | `false`                    | Line length limit is disabled; do not wrap prose at an arbitrary column count                                   |
| MD024 | `false`                    | Duplicate heading text is permitted; sibling sections in different parts of a document may share a heading name |
| MD026 | `false`                    | Trailing punctuation in headings is permitted                                                                   |
| MD029 | `{ "style": "ordered" }`   | Ordered list items must use sequential numbers (1, 2, 3), not repeated ones (1, 1, 1)                           |
| MD031 | `false`                    | Blank lines around fenced code blocks are not required by the linter (but are required by these rules)          |
| MD033 | `false`                    | Inline HTML is permitted where Markdown cannot express the required structure                                   |
| MD034 | `false`                    | Bare URLs without angle brackets are permitted                                                                  |
| MD036 | `false`                    | Emphasis used as a heading substitute is permitted                                                              |
| MD038 | `false`                    | Spaces inside code span backticks are permitted                                                                 |
| MD040 | `false`                    | Fenced code blocks without a language identifier do not fail the linter (but specifying one is recommended)     |
| MD041 | `false`                    | Files are not required to begin with a top-level heading (though they should by convention)                     |

Rules not listed above use the `markdownlint-cli2` defaults and are fully enforced.

---

## Formatting Standards

### Indentation

Use spaces for indentation. Never use hard tabs in prose, headings, list items, or table cells. The sole exception is fenced code blocks where the target language requires tabs, such as Makefile snippets.

### Headings

- Use ATX-style headings (`#`, `##`, `###`). Do not use Setext-style underlines (`===`, `---`).
- Place one blank line before every heading and one blank line after every heading.
- Do not skip heading levels. Descend sequentially: `#` to `##` to `###`.
- Each file must contain exactly one `#` heading. Place it on the first non-blank line.
- Use `##` for major sections and `###` for subsections within a section.

### Lists

- Unordered lists must use `-` as the list marker. Do not use `*` or `+`.
- Ordered lists must use sequential numbers: `1.`, `2.`, `3.`. Do not use repeated `1.` for every item.
- Nest list items with four spaces of indentation.
- Do not mix ordered and unordered markers within the same list level.

### Code Blocks

- Use fenced code blocks with triple backticks. Do not use indented code blocks.
- Place one blank line before the opening fence and one blank line after the closing fence.
- Specify the language identifier immediately after the opening backticks whenever the language is known. This enables syntax highlighting in rendered output and is the recommended practice even though MD040 does not enforce it.
- Makefile recipe lines inside code blocks must use real tabs. The `"MD010": { "code_blocks": false }` setting exists specifically to accommodate this requirement.

### Tables

- All tables must use leading and trailing pipes on every row.
- Align column separators with dashes in the header row. The minimum separator is `---`.
- Pad cell content with spaces so columns align visually in the source file.

### Links

- Use inline links for URLs that appear once: `[text](url)`.
- Use reference-style links for any URL that appears more than once in the same file. Place the reference definitions at the bottom of the file.
- Do not use bare URLs in prose; wrap them in angle brackets or use a labelled link.

### Whitespace

- No trailing whitespace on any line.
- Files must end with exactly one newline character. Do not add a blank line after the final line of content.
- Separate top-level sections with a horizontal rule (`---`) preceded and followed by one blank line.

---

## File Naming

Standalone Markdown documents use `kebab-case.md` (for example, `contributing-guide.md`, `release-process.md`).

Files in specific directories follow the naming convention of that directory:

| Directory               | Convention                | Example                                    |
| ----------------------- | ------------------------- | ------------------------------------------ |
| `shared/rules/`         | `<topic>.md`              | `shared/rules/security.md`                 |
| `copilot/instructions/` | `<topic>.instructions.md` | `copilot/instructions/api.instructions.md` |

Do not use spaces, uppercase letters, or underscores in Markdown file names unless an existing file in the same directory already uses that convention.

---

## Headings Checklist

Before committing a Markdown file, verify:

- [ ] Exactly one `#` heading at the top of the file
- [ ] Heading levels descend sequentially with no gaps
- [ ] One blank line before and after every heading
- [ ] No trailing punctuation that violates project conventions
- [ ] Headings describe the content of the section accurately

---

## Code Blocks Checklist

Before committing a Markdown file, verify:

- [ ] All code blocks use fenced style with triple backticks
- [ ] All code blocks have a language identifier where the language is known
- [ ] One blank line before and after every code block
- [ ] Makefile recipe lines inside code blocks use real tabs, not spaces
- [ ] No indented code blocks remain in the file
