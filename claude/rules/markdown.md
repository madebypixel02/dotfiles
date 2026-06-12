---
paths:
  - "**/*.md"
  - "**/*.mdx"
  - "**/.markdownlint*"
---

@../../shared/rules/markdown.md

---

## Code Review Gate -- Markdown

Before approving any Markdown change:

- [ ] `markdownlint-cli2` passes with zero errors
- [ ] One H1 per document, headings in sequential order
- [ ] Fenced code blocks have language identifiers
- [ ] No trailing whitespace or missing final newline
- [ ] File named in kebab-case with `.md` extension
