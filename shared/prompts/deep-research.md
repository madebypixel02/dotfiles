# Deep Research Workflow

Use this workflow when a task requires thorough investigation before a conclusion or recommendation can be made responsibly.

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

---

## Phase 1 — Frame the Question

Before researching, sharpen the question.

**State the decision to be made.**
What will be different after this research is complete? A good research question ends in a concrete decision or action. "What are microservices?" is not a research question. "Should we decompose the payment module into a separate service given our current team size and deployment infrastructure?" is.

**Define success criteria.**
What would a good answer look like? List the properties a satisfactory solution must have (must-haves) and the properties that would make one option preferable to another (nice-to-haves).

**Identify constraints.**
What cannot change? Technology stack, compliance requirements, budget, timeline, team skills, existing contracts. Constraints define the feasible solution space before you start.

**List what you already know.**
Summarise current knowledge. This surfaces assumptions that need to be tested and prevents re-researching what is already understood.

---

## Phase 2 — Systematic Investigation

**Explore primary sources first.**
For code questions: read the source code and official documentation before reading blog posts or Stack Overflow. For technology choices: read the official documentation, release notes, and known limitations before reading opinions.

**For codebase research:**

- Run `git log --oneline --all` to understand the history
- Read the architecture documentation, if it exists
- Trace the data flow for the relevant operation end-to-end
- Identify the decision points and their rationale (look in commit messages, ADRs, and PR descriptions)

**For technology evaluation:**

- Read the official documentation for each candidate
- Identify the design philosophy and primary use cases
- Research known limitations, failure modes, and scaling characteristics
- Check the maintenance health: release frequency, open issues, contributor activity, corporate backing
- Find production case studies from organisations with similar scale and requirements

**For bug or performance investigation:**

- Reproduce the problem in isolation before theorising about the cause
- Form a hypothesis and design a test that would disprove it
- Eliminate alternative causes systematically
- Do not stop at the first plausible explanation — confirm it

**Triangulate across sources.**
A claim supported by the official documentation, a production case study, and independent benchmarks is more reliable than one supported by a single blog post.

**Note conflicting information.**
When sources disagree, record the disagreement and assess the reliability and recency of each source. Do not silently pick the conclusion you prefer.

---

## Phase 3 — Analysis

**Apply the success criteria.**
For each candidate or finding, score it against the must-haves and nice-to-haves defined in Phase 1. A candidate that fails a must-have is eliminated.

**Identify risks.**
For each viable option, enumerate the risks: technical risk (will it work at our scale?), operational risk (can we run it?), adoption risk (can the team learn it?), vendor risk (is the supplier stable?).

**Consider second-order effects.**
What else changes if we choose this option? What does it make easier? What does it make harder? What does it foreclose?

**Stress-test your conclusion.**
Argue against your preferred answer. What would have to be true for the alternative to be correct? Are those conditions present?

---

## Phase 4 — Synthesis

**Write a structured summary.**

Include:

1. **Question restated** — confirm you answered the right question
2. **Method** — briefly describe how you investigated (what sources, what tests, what analysis)
3. **Findings** — the key facts discovered, with citations or references
4. **Options considered** — for each option evaluated, a brief description and its key trade-offs
5. **Recommendation** — a clear, specific recommendation with the reasoning
6. **Risks and mitigations** — the risks in the recommended approach and how to manage them
7. **Open questions** — what remains uncertain and what would be needed to resolve it
8. **Next steps** — the concrete actions that follow from the recommendation

**Be explicit about confidence level.**
State when you are certain (based on direct evidence) versus when you are reasoning under uncertainty. Do not present inference as fact.

**Separate facts from opinions.**
Label each claim as: observed fact, documented behaviour, expert consensus, reasoned inference, or personal judgement.

---

## Phase 5 — Review

Before delivering the research output:

**Check for motivated reasoning.**
Did you search for evidence that confirms a prior conclusion rather than evidence that tests it? Have you given fair treatment to options you personally disfavour?

**Check completeness.**
Does the output answer the question as framed? Does it address all the constraints? Does it include enough information for a decision-maker to act without needing to do additional research themselves?

**Check actionability.**
Is the recommendation specific enough to act on? If someone read only the recommendation and next steps, would they know what to do?

---

## Output Template

```
## Research: [QUESTION]

### Method
[How the investigation was conducted]

### Key Findings
- [Finding 1]
- [Finding 2]
- ...

### Options Evaluated

**Option A: [Name]**
- Description: ...
- Pros: ...
- Cons: ...
- Risk: ...

**Option B: [Name]**
- ...

### Recommendation
[Clear, specific recommendation and primary rationale]

### Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ... | ... | ... | ... |

### Open Questions
- [What remains uncertain]

### Next Steps
1. [First action]
2. [Second action]
```
