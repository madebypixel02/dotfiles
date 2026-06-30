<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->
<!-- Source: copilot/templates/prompts/standup.template.md + shared/prompts/standup.md -->
<!-- Regenerate with: scripts/sync-dotfiles.sh -->

# Standup Preparation

You are preparing a daily standup update for the engineering team. Analyse all available signals to produce a concise, accurate standup report.

---

# Standup Workflow

Prepare a concise, useful daily standup update.

---

## Input

[CONTEXT] -- optionally: team name, sprint goal, known blockers, date range (defaults to since previous working day).

---

## Purpose

Standup is a team synchronisation mechanism, not a management status report. Surface: who is working on what, who is blocked, risks to sprint goal.

A good update is:

- **Brief** -- 60-90 seconds verbal
- **Specific** -- references tasks, PRs, decisions, not vague activity
- **Actionable** -- identifies needed help or decisions
- **Forward-looking** -- what matters today, not exhaustive yesterday log

---

## Phase 1 -- Gather Yesterday's Work

**Git activity.** `git log --oneline --after="yesterday" --author="$(git config user.name)"`. Note changes.

**PRs.** Opened, updated, reviewed, or merged since last standup.

**Task tracker.** Tickets moved to In Progress, In Review, or Done.

**Decisions.** Architectural, product, or process decisions made/unblocked.

---

## Phase 2 -- Today's Focus

**Primary task.** Single most important thing to finish/advance today. Aligned with sprint goal.

**Supporting tasks.** Reviews, meetings, secondary tasks taking meaningful time.

**Hidden blockers.** Anything preventing primary task completion? Name it now.

---

## Phase 3 -- Blockers and Risks

Blocker = prevents forward progress now. Risk = might block if unaddressed.

For each:

- Name specifically: "Waiting for API contract from platform team" not "blocked on dependency"
- State what you need: decision, review, access, answer
- State who can unblock (if known)

---

## Phase 4 -- Format

```
Yesterday:
- [Specific task or outcome 1]
- [Specific task or outcome 2]

Today:
- [Primary task with enough detail to be meaningful]
- [Secondary task if significant]

Blockers / Risks:
- [Blocker: what it is, what you need, who can help]
- None (if no blockers)
```

Guidelines:

- Past tense for yesterday: "Completed", "Merged", "Reviewed", "Investigated"
- Active voice for today: "Will finish", "Continuing", "Starting"
- Reference ticket/PR numbers or feature names
- One sentence per bullet

---

## Example

Good:

```
Yesterday:
- Completed the database migration for the new audit_log table (PR #412 merged)
- Reviewed and approved the API error-handling PR from Priya

Today:
- Finishing the audit log service integration tests — aiming to have PR open by noon
- Quick look at the spike ticket for the export feature scoping

Blockers:
- Need sign-off from Jordan on the retention policy decision (DM'd them; hoping for response this morning)
```

---

## Calendar Context

- Monday: aggregate full previous week (not just Friday)
- Friday: flag work needing known state before weekend
- Post-holiday: extend "yesterday" window accordingly

---

## When to Flag to the Team

Beyond the three standard items, flag if:

- Sprint goal at risk (time, dependencies, scope)
- Unmade decision needed by team
- Technical risk affecting more than your ticket
- Need pairing help on complex problem
- Impediment requiring lead/manager awareness

---

## Standup Checklist

- [ ] Git log reviewed since last standup
- [ ] PRs and task board reviewed
- [ ] Yesterday summarised in specific terms
- [ ] Today's primary task identified, aligned with sprint goal
- [ ] Blockers identified with specific asks
- [ ] Update fits 60-90 seconds
- [ ] Team-level risks/flags identified
