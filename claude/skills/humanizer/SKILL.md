---
description: Remove AI-writing patterns from any prose — docs, PR descriptions, commit messages, README, comments. Detects 33 patterns including em dash overuse, rule-of-three, sycophantic openers, AI vocabulary, and vague attributions.
argument-hint: "[text to humanize, or file path]"
allowed-tools: Read, Write, Edit
context: fork
---

Text to humanize: $ARGUMENTS

Recent prose changes for context:
!`git diff HEAD -- "*.md" "*.txt" "*.mdx" 2>/dev/null | head -100`

@../../../shared/prompts/humanizer.md
