---
description: Deep technical research — spawns parallel research agents, cross-validates findings, produces comprehensive technical report with citations
agent: orchestrator
subtask: true
---

# Deep Research: $ARGUMENTS

You are an orchestrator agent conducting deep, rigorous technical research. The research question is:

> **$ARGUMENTS**

This is not a quick summary task. This is a systematic investigation that produces a citable, decision-quality technical report. Apply the same rigour that a staff engineer would apply when evaluating a major architectural decision.

---

## Research Context

```
Current project for relevance grounding:
!`cat README.md 2>/dev/null | head -20 || echo "(no README — research is context-free)"`

Technology stack (to anchor recommendations):
!`cat package.json 2>/dev/null | head -30 && cat pyproject.toml 2>/dev/null | head -20 && cat go.mod 2>/dev/null | head -10 || echo "(no manifest found)"`

Existing ADRs (avoid contradicting accepted decisions):
!`ls docs/decisions/ 2>/dev/null | head -10 || echo "(no existing ADRs)"`

Date (for temporal relevance of findings):
!`date +"%Y-%m-%d"`
```

---

## Research Methodology

You will conduct research using **five parallel workstreams**, then synthesise their findings using critical cross-validation. Each workstream approaches the research question from a different angle.

Acknowledge that as a language model you have a training cutoff and cannot access real-time data. Flag any findings that may be temporally sensitive and recommend verification against current sources.

---

## Parallel Workstreams

Run all five simultaneously. Do not wait for one to complete before starting others.

---

### Workstream 1 — Foundational Theory

_Purpose: Establish the theoretical and conceptual bedrock._

Answer:

1. What is the precise technical definition of the concept(s) in the research question?
2. What are the foundational principles and invariants that govern this domain?
3. What is the mathematical or formal basis (if applicable)?
4. What are the key properties, guarantees, and constraints?
5. What does the academic/research literature say about this topic?
6. What are the seminal papers, books, or RFC/spec documents?

**Output:** Conceptual foundation section with precise definitions and theoretical grounding.

---

### Workstream 2 — Industry Practice Survey

_Purpose: Understand how this is actually done in production systems._

Answer:

1. How do large-scale, production systems (FAANG, major open-source projects) approach this?
2. What are the dominant industry patterns and their trade-offs?
3. What have companies published in engineering blogs about this topic?
4. What does the ecosystem of tools and libraries reveal about common approaches?
5. Where does industry practice diverge from theoretical best practice, and why?
6. What patterns have been adopted and then abandoned (anti-patterns that seemed like patterns)?

**Output:** Industry practice survey with concrete examples and trade-off analysis.

---

### Workstream 3 — Comparative Analysis

_Purpose: Evaluate the specific options or approaches relevant to the research question._

1. Identify all viable approaches, tools, or solutions relevant to the question.
2. For each option, evaluate:

| Criterion              | Option A | Option B | Option C |
| ---------------------- | -------- | -------- | -------- |
| Performance            |          |          |          |
| Scalability            |          |          |          |
| Operational complexity |          |          |          |
| Learning curve         |          |          |          |
| Ecosystem maturity     |          |          |          |
| Community/support      |          |          |          |
| Cost implications      |          |          |          |
| Vendor lock-in risk    |          |          |          |
| Maintenance burden     |          |          |          |
| Security posture       |          |          |          |

3. Identify the decision factors that most strongly differentiate the options.
4. Provide a decision guide: "Choose A when X; choose B when Y; choose C when Z."

**Output:** Comparative analysis matrix with decision guide.

---

### Workstream 4 — Failure Mode Analysis

_Purpose: Understand what goes wrong and why._

Answer:

1. What are the most common failure modes and mistakes in this domain?
2. What are the well-known pitfalls and anti-patterns?
3. What does post-mortem analysis from public incidents reveal?
4. What edge cases are commonly overlooked?
5. What does the system fail like at scale (if relevant)?
6. What are the security failure modes (if applicable)?
7. What do experienced practitioners universally warn against?

**Output:** Failure mode catalogue with concrete examples and prevention strategies.

---

### Workstream 5 — Implementation & Operationalisation

_Purpose: Translate research into actionable guidance._

Answer:

1. What does a minimal, correct implementation look like?
2. What does a production-grade implementation add beyond the minimum?
3. What are the key configuration decisions and their implications?
4. How should this be monitored and observed in production?
5. What are the testing strategies for this domain?
6. How does this affect the development workflow?
7. What are the migration paths from alternative approaches?

**Output:** Actionable implementation guide with concrete code patterns where applicable.

---

## Cross-Validation

After all five workstreams complete, perform critical cross-validation:

### Consistency Check

- Do the findings from different workstreams agree?
- Where do they diverge, and why?
- Are any conclusions from one workstream contradicted by another?

### Confidence Assessment

For each major finding, assess confidence:

| Finding   | Confidence      | Basis           | Caveats       |
| --------- | --------------- | --------------- | ------------- |
| [finding] | High/Medium/Low | [why confident] | [limitations] |

**Confidence levels:**

- **High:** Supported by multiple independent sources, well-established in industry, unlikely to change.
- **Medium:** Generally accepted but with known nuances or evolving consensus.
- **Low:** Limited evidence, highly context-dependent, or rapidly evolving area.

### Temporal Sensitivity

Flag findings that may become outdated:

- Specific version numbers or release dates
- Benchmark figures (hardware-specific, may improve)
- Market adoption statistics
- Tool recommendations (ecosystem evolves rapidly)

---

## Synthesis

Produce the final research report:

```markdown
# Technical Research Report: $ARGUMENTS

**Date:** !`date +"%Y-%m-%d"`
**Researcher:** OpenCode Deep Research Agent
**Confidence:** [Overall confidence level]

---

## Executive Summary

[3-5 paragraph summary suitable for a technical executive or staff engineer who needs the key findings without reading the full report.

Must include:

- The core finding / answer to the research question
- The key trade-offs
- The primary recommendation (if applicable)
- The most important caveats]

---

## Research Question

$ARGUMENTS

### Scope & Constraints

- [What is in scope for this research]
- [What is explicitly out of scope]
- [Key assumptions made]

---

## Foundational Concepts

### Definitions

**[Key Term 1]:** [Precise definition]

**[Key Term 2]:** [Precise definition]

### Core Principles

[2-4 paragraphs establishing the theoretical foundation]

---

## Industry Practice

[Survey of how this is approached in production systems, with concrete examples]

---

## Comparative Analysis

### Options Evaluated

[Detailed comparison from Workstream 3]

### Decision Guide

| If your situation is... | Then consider... | Because...  |
| ----------------------- | ---------------- | ----------- |
| [context]               | [option]         | [rationale] |
| [context]               | [option]         | [rationale] |

---

## Common Failures & Anti-Patterns

[Failure mode catalogue from Workstream 4]

| Anti-Pattern   | Why It Fails   | Correct Approach |
| -------------- | -------------- | ---------------- |
| [anti-pattern] | [failure mode] | [alternative]    |

---

## Implementation Guide

### Minimal Correct Implementation

[Code examples or patterns for a basic correct implementation]

### Production Considerations

[What a production-grade implementation adds]

### Testing Strategy

[How to test this effectively]

### Observability

[How to monitor and alert on this in production]

---

## Findings & Confidence

| #   | Finding       | Confidence | Notes                          |
| --- | ------------- | ---------- | ------------------------------ |
| 1   | [key finding] | High       |                                |
| 2   | [key finding] | Medium     | Verify against current tooling |
| 3   | [key finding] | Low        | Rapidly evolving area          |

---

## Recommendations

### Primary Recommendation

[The clearest, most direct answer to the research question]

### Secondary Recommendations

1. [recommendation]
2. [recommendation]
3. [recommendation]

### When NOT to Apply These Recommendations

[Explicitly state the conditions under which these recommendations do not apply]

---

## Open Questions

[Questions that this research raised but could not definitively answer — these may require further investigation, benchmarking, or expert consultation]

1. [open question]
2. [open question]

---

## References & Further Reading

### Foundational

- [Paper/Book/RFC title] — [author/organisation] — [why relevant]

### Practical

- [Blog post / documentation title] — [author/organisation] — [why relevant]

### Tools & Projects

- [Tool name] — [what it does] — [URL if known]

---

_This report reflects the research agent's analysis based on training data with a knowledge cutoff. Validate time-sensitive findings (version numbers, benchmarks, market adoption) against current sources before making major decisions._

_Research question: $ARGUMENTS_
_Generated: !`date +"%Y-%m-%d"`_
```

---

## Research Quality Gate

Before delivering the report, verify:

- [ ] Research question is directly answered in the Executive Summary
- [ ] All five workstreams contributed findings
- [ ] Conflicting findings between workstreams are explicitly addressed
- [ ] Confidence levels are assigned to all major findings
- [ ] Temporal sensitivities are flagged
- [ ] Concrete, actionable recommendations are provided
- [ ] Open questions are documented (intellectual honesty)
- [ ] The report is written for a technical audience — precise, not vague
