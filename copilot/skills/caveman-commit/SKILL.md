---
name: caveman-commit
description: Generate terse, precise conventional commit messages from staged changes. Never runs git commit -- outputs message only. Use when writing commit messages.
compatibility: opencode claude-code copilot
allowed-tools:
  - Bash
---

# Caveman Commit

Generate terse conventional commit messages. Output only. Never run `git commit`.

## Context

!`git diff --staged --stat`
!`git log --oneline -5`

## Format

```
<type>(<scope>): <imperative summary>

[optional body]

[optional footer]
```

## Subject Line

- 50 chars ideal, 72 hard cap
- Imperative: "add X", "fix Y", "remove Z". Not "added", "fixes", "removing"
- No trailing period. Lowercase after colon
- Scope = affected module/file/subsystem. Omit if repo-wide

## Body (only when needed)

Required for: breaking changes (`BREAKING CHANGE:`), bug fixes where root cause matters, issue refs (`Closes #123`). Plain prose, blank line after subject, wrap at 72.

Never: restate filenames, write "This commit does X", add AI attribution, summarize what diff shows.

## Types

| Type     | When                                       |
| -------- | ------------------------------------------ |
| feat     | New capability visible to users or callers |
| fix      | Corrects a defect                          |
| refactor | No behavior change; restructures code      |
| perf     | Measurable performance improvement         |
| docs     | Documentation only                         |
| test     | Test-only changes                          |
| chore    | Tooling, config, dependencies              |
| build    | Build system or scripts                    |
| ci       | CI/CD pipeline changes                     |
| style    | Formatting, whitespace (no logic change)   |
| revert   | Reverts a previous commit                  |

## Examples

Good:

```
fix(auth): reject expired tokens before role check

Tokens were validated after RBAC, allowing expired tokens to pass
if the role matched. Check expiry first.

Closes #412
```

Good (simple):

```
chore(deps): bump eslint to 9.4.0
```

Bad:

```
Updated the authentication file to fix a bug where tokens were not being checked properly and also updated some dependencies while I was at it
```

## Output

Print only the commit message. No preamble. No explanation. No markdown fences unless the message itself contains code blocks.
