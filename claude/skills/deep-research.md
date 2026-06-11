---
description: Conduct thorough, evidence-based technical research and produce an actionable report with a clear recommendation.
argument-hint: <research topic or question>
allowed-tools: Read, Grep, Glob, Bash, Write
context: fork
---

# Deep Research Workflow

Conduct thorough, evidence-based research on a technical topic and produce an
actionable report.

## Input

Research topic: $ARGUMENTS

## Repository context (if applicable)

!`git log --oneline -5 2>/dev/null || echo "Not a git repository"`
!`ls -1 2>/dev/null | head -20`

## Phase 1 — Scope

Define clearly:

1. The specific question(s) to answer.
2. What a good answer looks like (decision criteria).
3. What is out of scope.
4. Time / depth constraint (quick survey vs exhaustive analysis).

## Phase 2 — Source Gathering

Collect information from:

- Official documentation (primary source, highest trust)
- Source code (ground truth for behaviour)
- Academic papers / RFCs / specs (for foundational topics)
- Reputable engineering blogs (secondary, verify claims)
- Issue trackers and changelogs (for known bugs and limitations)

For each source: note the URL, date, and trustworthiness level.

Do NOT treat Stack Overflow answers or LLM outputs as authoritative without
cross-referencing primary sources.

## Phase 3 — Analysis

Synthesise findings:

- What is the consensus view?
- Where do sources disagree — and why?
- What are the known unknowns?
- What experiments or proofs-of-concept would resolve remaining uncertainty?

## Phase 4 — Options (if applicable)

For technology or approach comparisons, evaluate each option against:

- Correctness / reliability
- Performance characteristics
- Operational complexity
- Security posture
- Community/maintenance health
- Licence compatibility
- Migration cost from current state

Use a structured comparison table when comparing three or more options.

## Phase 5 — Recommendation

Provide a clear recommendation:

- What to do
- Why (evidence-backed)
- What risks to monitor
- What to revisit and when

Distinguish between "high confidence" and "best current guess" conclusions.

## Phase 6 — Report

Produce a written report with:

1. Executive summary (3–5 sentences, decision-ready)
2. Detailed findings with citations
3. Options comparison (if applicable)
4. Recommendation with rationale
5. Open questions and next steps
6. Source list
