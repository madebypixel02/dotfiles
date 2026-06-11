# Architecture Decision Record (ADR)

Use this workflow to document a significant architectural decision in a durable, reviewable format.

---

## Input

[DECISION TOPIC] — describe the architectural question or decision to be recorded. Include: the context in which the decision arose, who the stakeholders are, and the date the decision was made (or is being made).

---

## When to Write an ADR

Write an ADR when making a decision that:

- Is difficult or costly to reverse
- Affects multiple services, teams, or system components
- Establishes a pattern or convention that others will follow
- Involves a meaningful trade-off between alternatives
- Is likely to be questioned in the future without context

Do not write an ADR for routine implementation choices. ADRs are for decisions at the level of: choice of database, inter-service communication protocol, authentication approach, API versioning strategy, caching layer, message broker, or core library adoption.

---

## ADR Template

Create the ADR document using the structure below. Write in plain prose — clear, specific, and honest about trade-offs.

---

```
# ADR-[NUMBER]: [TITLE]

**Date:** [YYYY-MM-DD]
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-N]
**Deciders:** [Names or roles of people who made or approved this decision]
**Consulted:** [Names or roles of people whose input was sought]

---

## Context

[Describe the situation that requires a decision. What problem are we trying to solve?
What forces are at play — technical constraints, business requirements, team capabilities,
time pressure, compliance requirements? What would happen if we made no decision?

Be specific. Avoid vague statements like "we need to scale". Prefer: "The users table
currently has 8M rows and grows at 200k per week. Our primary query (find users by
email domain with recent activity) runs full table scans and takes 4s at p99, which
exceeds our 500ms SLA."]

---

## Decision

[State the decision in one or two sentences. Be unambiguous. This should be readable
as a standalone statement.

Example: "We will introduce a read replica and add a composite index on (email_domain,
last_active_at) to the users table, rather than migrating to a distributed database."]

---

## Options Considered

### Option 1: [Name]

[Brief description of the approach.]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Why not chosen:** [If this was not the chosen option, explain why.]

---

### Option 2: [Name]

[Repeat the structure above for each option considered.]

---

### Option N: [Chosen option name]

[Include the chosen option in this list as well, with its own pros and cons.]

**Why chosen:** [The decisive factors that led to this option being selected over the alternatives.]

---

## Consequences

### Positive
- [What becomes easier or better as a result of this decision]
- [What problems this decision solves]

### Negative
- [What becomes harder or worse as a result of this decision]
- [Technical debt this decision incurs]
- [What this decision forecloses]

### Risks
- [Risk 1]: [Likelihood] — [Mitigation]
- [Risk 2]: [Likelihood] — [Mitigation]

---

## Implementation Notes

[Optional: any guidance for teams implementing the decision. Key steps, gotchas,
sequencing requirements, or links to implementation issues/PRs.]

---

## Review Date

[If this decision should be revisited after a certain period or after certain conditions
are met, state it here. Example: "Review if user table exceeds 100M rows" or
"Review Q4 2026 when the team evaluates distributed database options."]
```

---

## ADR Filing and Numbering

- Store ADRs in the project's ADR directory (typically `docs/adr/` or `architecture/decisions/`)
- Number ADRs sequentially: `ADR-001`, `ADR-002`, etc.
- Name files consistently: `0042-choose-message-broker.md`
- Do not delete superseded ADRs — mark them as `Superseded by ADR-N` and keep them for history

## ADR Status Lifecycle

- **Proposed** — the decision is under discussion; not yet final
- **Accepted** — the decision has been made and is in effect
- **Deprecated** — the decision was valid but is no longer relevant (e.g., the component it covered was removed)
- **Superseded by ADR-N** — a later decision replaces this one; link to the superseding ADR

---

## Writing Quality Checklist

Before filing the ADR, verify:

- [ ] Context section explains the problem, not just the solution
- [ ] Decision statement is unambiguous and self-contained
- [ ] All options that were seriously considered are documented
- [ ] The reason each non-chosen option was rejected is stated
- [ ] Positive and negative consequences are honest — not just benefits
- [ ] Risks are specific and include mitigations
- [ ] The ADR is written at a level of detail that a new team member can understand without additional context
- [ ] Status, date, and deciders are filled in
- [ ] ADR is numbered and filed in the correct directory
