---
description: Daily standup prep — analyses git commits, open work, and TODOs to generate What Was Done / Blockers / What's Next
agent: orchestrator
---

# Standup Preparation

You are preparing a daily standup update for the engineering team. Analyse all available signals to produce a concise, accurate standup report.

---

## Context Gathering

```
Current date and time:
!`date`

Current branch:
!`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"`

Yesterday's commits (last 24 hours across all branches):
!`git log --all --since="24 hours ago" --oneline --format="%ad %s (%an) [%h]" --date=short 2>/dev/null || echo "(no commits in last 24 hours)"`

My commits specifically (last 24 hours):
!`git log --all --since="24 hours ago" --oneline --author="$(git config user.name 2>/dev/null || echo "")" --format="%ad %s [%h]" --date=short 2>/dev/null || echo "(unable to filter by author)"`

All commits this week:
!`git log --all --since="1 week ago" --oneline --format="%ad %s (%an) [%h]" --date=short 2>/dev/null | head -40 || echo "(no commits this week)"`

Current branch status vs main:
!`git log main..HEAD --oneline 2>/dev/null || echo "(unable to compare with main)"`

Uncommitted work in progress:
!`git status --short 2>/dev/null || echo "(clean working tree)"`

Staged changes:
!`git diff --cached --stat 2>/dev/null || echo "(nothing staged)"`

Recent PRs / branches (shows what's been pushed):
!`git branch -r --sort=-committerdate 2>/dev/null | head -15 || echo "(no remote branches)"`

Open TODO/FIXME items in codebase (current branch):
!`grep -rn "TODO\|FIXME\|HACK\|XXX\|BLOCKED\|WIP" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" --include="*.rb" --include="*.rs" . 2>/dev/null | grep -v "node_modules\|dist\|build\|\.git" | head -25 || echo "(no TODO/FIXME items found)"`

Any todo files:
!`cat TODO.md 2>/dev/null || cat TODO 2>/dev/null || cat todo.md 2>/dev/null || echo "(no TODO.md file)"`

Test failures (last run results, if available):
!`cat .test-results 2>/dev/null || cat test-results.log 2>/dev/null || echo "(no cached test results — run tests manually)"`

CI status (if available locally):
!`cat .github/workflows/*.yml 2>/dev/null | grep -A2 "on:" | head -20 || echo "(check CI dashboard for current status)"`

Build health:
!`ls -la package.json 2>/dev/null && node -p "require('./package.json').version" 2>/dev/null || ls -la pyproject.toml go.mod Cargo.toml 2>/dev/null | head -5 || echo ""`
```

---

## Analysis

Based on all the gathered context, analyse and categorise the work:

### Completed Work (Yesterday)

Review the git log and staged changes to identify:

- Features implemented (look for `feat:` commits)
- Bugs fixed (look for `fix:` commits)
- Reviews completed (look for merge commits or review-related activity)
- Documentation or chore work
- Any significant in-progress work even if not yet committed

### Blockers

Identify potential blockers by looking for:

- Unresolved TODO/BLOCKED/FIXME comments
- Failed tests or CI failures
- Uncommitted work that has been sitting (indicates possible difficulty)
- Branches that have not progressed recently
- Any WIP comments in code

### Planned Work (Today)

Infer what is coming next from:

- Uncommitted changes (current in-progress work)
- Open TODO items near recently touched code
- Branch name and recent commit direction
- Any explicit NEXT or TODO markers

---

## Standup Report

Produce the standup update in this format (keep it concise — standup updates should be spoken in 60-90 seconds):

---

```
## Daily Standup — !`date +"%A, %B %d, %Y"`

### ✅ Yesterday
[2-5 bullet points of what was accomplished. Be specific about what was completed, not just worked on.
Use active voice: "Implemented X", "Fixed Y", "Reviewed Z", "Deployed A".]

- [accomplishment 1]
- [accomplishment 2]
- [accomplishment 3]

### 🚧 In Progress
[Work that was started but not yet complete — only include if truly in progress]

- [in-progress item 1] — [brief status / what remains]

### 🔴 Blockers
[ONLY include real blockers — things preventing forward progress.
If there are none, say "None" — do not invent blockers.]

- [blocker 1] — [what is needed to unblock]
- None

### 📋 Today
[2-4 bullet points of specific planned work for today.
Be concrete — not "continue working on X" but "finish the auth middleware and open PR for X".]

- [plan 1]
- [plan 2]
- [plan 3]

---
Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"`
Commits yesterday: [n]
Open TODOs in touched files: [n]
```

---

## Optional: PR Status Section

If there are open pull requests or recent branch pushes, add:

```
### 🔀 PR Status

| Branch | Status | Waiting for |
|--------|--------|------------|
| [branch-name] | Draft / Ready / In Review / Changes Requested | [reviewer / self] |
```

---

## Calendar Context

Note any context that affects the standup:

- If it is Monday, aggregate the full previous week's work (not just yesterday).
- If it is Friday, flag any work that needs to be in a known state before the weekend.
- If there was a holiday yesterday, acknowledge that and extend the "yesterday" window accordingly.

---

## Tips for a Good Standup

> These notes are for the engineer — remove before posting to team chat.

- **Accomplishments, not activities.** "Completed the auth endpoint" not "worked on auth".
- **Specific blockers only.** If you don't have a real blocker, say "None."
- **Time-box.** If you are presenting in a meeting, the above should take < 90 seconds to read aloud.
- **Follow up async.** Any topic that needs discussion should be taken off-standup.
