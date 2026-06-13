---
description: Daily standup prep — analyses git commits, open work, and TODOs to generate What Was Done / Blockers / What's Next
agent: orchestrator
subtask: true
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

Build health:
!`ls -la package.json 2>/dev/null && node -p "require('./package.json').version" 2>/dev/null || ls -la pyproject.toml go.mod Cargo.toml 2>/dev/null | head -5 || echo ""`
```

---

@../../shared/prompts/standup.md
