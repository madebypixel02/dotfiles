# Deep Research Workflow

Use this workflow when a task requires thorough investigation before a conclusion or recommendation can be made responsibly. Apply the same rigour that a staff engineer would apply when evaluating a major architectural decision.

---

## Input

[RESEARCH QUESTION] — state the question or decision to be answered. Include: the context in which the question arose, the constraints that apply (technology stack, timeline, compliance requirements, team experience), and what form the output should take (recommendation, comparison, implementation plan, risk assessment).

---

## When to Use Deep Research

Use this workflow when:

- Choosing between architectural approaches with long-term consequences
- Evaluating a library, framework, or external service for adoption
- Investigating the root cause of a non-obvious bug or performance problem
- Assessing the security posture of a system or change
- Building a business case that requires evidence
- Onboarding to an unfamiliar codebase, domain, or technology

Do not use this workflow for questions with clear, well-known answers. Reserve it for genuine uncertainty.

Acknowledge that as a language model you have a training cutoff and cannot access real-time data. Flag any findings that may be temporally sensitive and recommend verification against current sources.

---

## Phase 1 — Frame the Question

Before researching, sharpen the question.

**State the decision to be made.**
What will be different after this research is complete? A good research question ends in a concrete decision or action.

**Define success criteria.**
What would a good answer look like? List the properties a satisfactory solution must have (must-haves) and the properties that would make one option preferable to another (nice-to-haves).

**Identify constraints.**
What cannot change? Technology stack, compliance requirements, budget, timeline, team skills, existing contracts. Constraints define the feasible solution space before you start.

**List what you already know.**
Summarise current knowledge. This surfaces assumptions that need to be tested and prevents re-researching what is already understood.

---

## Phase 2 — Parallel Investigation Workstreams

Conduct research using five parallel workstreams, then synthesise their findings using critical cross-validation. Each workstream approaches the research question from a different angle. Run all five simultaneously.

---

### Workstream 1 — Foundational Theory

Establish the theoretical and conceptual bedrock.

Answer:

1. What is the precise technical definition of the concept(s) in the research question?
2. What are the foundational principles and invariants that govern this domain?
3. What is the mathematical or formal basis (if applicable)?
4. What are the key properties, guarantees, and constraints?
5. What does the academic or research literature say about this topic?
6. What are the seminal papers, books, or RFC/spec documents?

**Output:** Conceptual foundation section with precise definitions and theoretical grounding.

---

### Workstream 2 — Industry Practice Survey

Understand how this is actually done in production systems.

Answer:

1. How do large-scale, production systems approach this?
2. What are the dominant industry patterns and their trade-offs?
3. What have companies published in engineering blogs about this topic?
4. What does the ecosystem of tools and libraries reveal about common approaches?
5. Where does industry practice diverge from theoretical best practice, and why?
6. What patterns have been adopted and then abandoned?

**Output:** Industry practice survey with concrete examples and trade-off analysis.

---

### Workstream 3 — Comparative Analysis

Evaluate the specific options or approaches relevant to the research question.

1. Identify all viable approaches, tools, or solutions relevant to the question.
2. For each option, evaluate across these criteria:

| Criterion | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Performance | | | |
| Scalability | | | |
| Operational complexity | | | |
| Learning curve | | | |
| Ecosystem maturity | | | |
| Community/support | | | |
| Cost implications | | | |
| Vendor lock-in risk | | | |
| Maintenance burden | | | |
| Security posture | | | |

1. Identify the decision factors that most strongly differentiate the options.
2. Provide a decision guide: "Choose A when X; choose B when Y; choose C when Z."

**Output:** Comparative analysis matrix with decision guide.

---

### Workstream 4 — Failure Mode Analysis

Understand what goes wrong and why.

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

### Workstream 5 — Implementation and Operationalisation

Translate research into actionable guidance.

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

## Phase 3 — Cross-Validation

After all five workstreams complete, perform critical cross-validation.

**Consistency check.**
Do the findings from different workstreams agree? Where do they diverge, and why? Are any conclusions from one workstream contradicted by another?

**Confidence assessment.**
For each major finding, assess confidence:

| Finding | Confidence | Basis | Caveats |
| --- | --- | --- | --- |
| [finding] | High/Medium/Low | [why confident] | [limitations] |

Confidence levels:

- **High:** Supported by multiple independent sources, well-established in industry, unlikely to change.
- **Medium:** Generally accepted but with known nuances or evolving consensus.
- **Low:** Limited evidence, highly context-dependent, or rapidly evolving area.

**Temporal sensitivity.**
Flag findings that may become outdated: specific version numbers, benchmark figures, market adoption statistics, or tool recommendations where the ecosystem evolves rapidly.

**Motivated reasoning check.**
Did you search for evidence that confirms a prior conclusion rather than evidence that tests it? Have you given fair treatment to options you personally disfavour?

---

## Phase 4 — Synthesis

Produce the final research report using this structure:

```
Technical Research Report: [RESEARCH QUESTION]

Date: [YYYY-MM-DD]
Overall Confidence: [High/Medium/Low]

---

Executive Summary

[3-5 paragraph summary suitable for a technical executive or staff engineer.
Must include: the core finding, the key trade-offs, the primary recommendation,
and the most important caveats.]

---

Research Question

[Question restated verbatim]

Scope and Constraints:
- [What is in scope]
- [What is explicitly out of scope]
- [Key assumptions made]

---

Foundational Concepts

Definitions:
[Key Term 1]: [Precise definition]
[Key Term 2]: [Precise definition]

Core Principles:
[2-4 paragraphs establishing the theoretical foundation]

---

Industry Practice

[Survey from Workstream 2 with concrete examples]

---

Comparative Analysis

Options Evaluated:
[Detailed comparison from Workstream 3]

Decision Guide:
| If your situation is... | Then consider... | Because... |
| [context] | [option] | [rationale] |

---

Common Failures and Anti-Patterns

[Failure mode catalogue from Workstream 4]

| Anti-Pattern | Why It Fails | Correct Approach |
| [anti-pattern] | [failure mode] | [alternative] |

---

Implementation Guide

Minimal Correct Implementation:
[Code examples or patterns for a basic correct implementation]

Production Considerations:
[What a production-grade implementation adds]

Testing Strategy:
[How to test this effectively]

Observability:
[How to monitor and alert on this in production]

---

Findings and Confidence

| # | Finding | Confidence | Notes |
| 1 | [key finding] | High | |
| 2 | [key finding] | Medium | Verify against current tooling |
| 3 | [key finding] | Low | Rapidly evolving area |

---

Recommendations

Primary Recommendation:
[The clearest, most direct answer to the research question]

Secondary Recommendations:
1. [recommendation]
2. [recommendation]

When NOT to Apply These Recommendations:
[Explicitly state the conditions under which these recommendations do not apply]

---

Open Questions

[Questions that this research raised but could not definitively answer]

1. [open question]
2. [open question]

---

References and Further Reading

Foundational:
- [Paper/Book/RFC title] — [author/organisation] — [why relevant]

Practical:
- [Blog post/documentation title] — [author/organisation] — [why relevant]

Tools and Projects:
- [Tool name] — [what it does]

---

Note: Validate time-sensitive findings (version numbers, benchmarks, market adoption)
against current sources before making major decisions.
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
- [ ] Open questions are documented
- [ ] The report is written for a technical audience — precise, not vague
- [ ] Completeness: the output contains enough information for a decision-maker to act without additional research
