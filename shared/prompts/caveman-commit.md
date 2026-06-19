# Caveman Commit

Generate terse, precise conventional commit messages. Output message only. Never run `git commit`.

## Context

!`git diff --staged --stat`
!`git log --oneline -5`

## Format

```
<type>(<scope>): <imperative summary>

[optional body]

[optional footer]
```

## Subject Line Rules

- 50 chars ideal, 72 hard cap.
- Imperative mood: "add X", "fix Y", "remove Z". Not "added", "fixes", "removing".
- No trailing period. Lowercase after colon.
- Scope = affected module/file/subsystem. Omit if repo-wide.

## Body Rules (only when needed)

Body only when the why is non-obvious. Required for:

- Breaking changes (must start with `BREAKING CHANGE:`)
- Bug fixes where root cause matters
- Changes closing issues (`Closes #123`)

Plain prose. Blank line after subject. Wrap at 72 chars.

Never: restate filenames, write "This commit does X", add AI attribution, summarize what the diff shows.

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

Print only the commit message. No preamble. No explanation. No markdown fences unless the
message itself contains code blocks.
