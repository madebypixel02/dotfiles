# Standup Workflow

Use this workflow to prepare a concise, useful daily standup update.

---

## Input

[CONTEXT] — optionally provide: the team name, the sprint goal, any blockers you are already aware of, and the date range to cover (defaults to since the previous working day).

---

## Purpose of a Good Standup

A standup is a synchronisation mechanism for the team, not a status report to management. The goal is to surface information that helps the team coordinate: who is working on what, who is blocked and needs help, and whether there are risks to the sprint goal.

A good standup update is:

- **Brief** — 60-90 seconds to deliver verbally
- **Specific** — references actual tasks, PRs, decisions, not vague activity
- **Actionable** — identifies what help or decisions are needed
- **Forward-looking** — focuses on what matters today, not an exhaustive log of yesterday

---

## Phase 1 — Gather Yesterday's Work

**Review git activity.**
Run `git log --oneline --after="yesterday" --author="$(git config user.name)"` to see commits made since the last standup. Note what changed.

**Review pull requests.**
Check which PRs were opened, updated, reviewed, or merged since the last standup.

**Review task tracker.**
Check the sprint board or issue tracker for tickets moved to In Progress, In Review, or Done.

**Identify decisions made.**
Were any architectural, product, or process decisions made or unblocked since the last standup?

---

## Phase 2 — Identify Today's Focus

**Determine the primary task.**
What is the single most important thing to finish or advance today? This should be aligned with the sprint goal.

**Identify supporting tasks.**
Are there reviews, meetings, or secondary tasks that will take meaningful time today?

**Confirm there are no hidden blockers.**
Is there anything that could prevent completing today's primary task? If so, name it now.

---

## Phase 3 — Identify Blockers and Risks

A blocker is something that is preventing forward progress right now. A risk is something that might block progress if not addressed.

For each blocker or risk:

- Name it specifically: "Waiting for the API contract from the platform team" not "blocked on external dependency"
- State what you need: a decision, a code review, access to an environment, a question answered
- State who can unblock you (if known)

---

## Phase 4 — Format the Update

Structure the standup using this format:

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

Writing guidelines:

- Use past tense for yesterday's items: "Completed", "Merged", "Reviewed", "Investigated"
- Use active voice for today's items: "Will finish", "Continuing", "Starting"
- Reference ticket numbers, PR numbers, or feature names so teammates can follow along
- Keep each bullet to one sentence

---

## Examples

Well-written standup:

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

Poorly written standup (avoid this):

```
Yesterday:
- Worked on stuff
- Did some code

Today:
- More of the same

Blockers:
- Waiting on people
```

---

## Calendar Context

Note any context that affects the standup:

- If it is Monday, aggregate the full previous week's work (not just yesterday)
- If it is Friday, flag any work that needs to be in a known state before the weekend
- If there was a holiday yesterday, acknowledge that and extend the "yesterday" window accordingly

---

## When to Flag Something to the Team

Beyond the standard three items, flag to the team during standup if:

- The sprint goal is at risk (not enough time, missing dependencies, scope grew)
- A decision is needed that the team has not made yet
- You discovered a technical risk that affects more than your own ticket
- You need pair programming help on a complex problem
- There is an impediment a team lead or manager needs to know about

---

## Standup Checklist

- [ ] Git log reviewed since last standup
- [ ] PRs and task board reviewed
- [ ] Yesterday's work summarised in specific, concrete terms
- [ ] Today's primary task identified and aligned with sprint goal
- [ ] Blockers identified with specific asks
- [ ] Update fits in 60-90 seconds
- [ ] Any team-level risks or flags identified
