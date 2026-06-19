---
name: humanizer
version: 2.8.0
description: Remove signs of AI-generated writing from text. Detects and fixes 33 patterns including inflated symbolism, em dash overuse, rule of three, AI vocabulary, sycophantic tone, passive voice, and filler phrases. Use when editing docs, commit messages, PR descriptions, comments, README files, or any prose that sounds AI-generated.
license: MIT
compatibility: opencode claude-code
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Humanizer

Detect and fix 33 patterns that signal AI-generated text. Deliver clean, human-sounding rewrite.

## Input

Text or file to humanize: $ARGUMENTS

## Process

1. **Read** input in full
2. **Identify** every instance of the 33 patterns. Note pattern number + location
3. **Draft** rewrite resolving all flagged instances
4. **Self-audit**: "what still sounds AI-generated?" List remaining signals
5. **Final rewrite**: apply self-audit corrections
6. **Deliver**: (a) audit bullets listing findings/fixes, (b) final text

## Hard Constraints

- Zero em dashes (--) and en dashes (-). Replace with period, comma, colon, or parentheses
- Zero curly/smart quotes. Straight quotes only (" ')
- Zero emojis unless original human text had them
- Never add content not in original. Only remove, rephrase, restructure
- No summary, explanation, or preamble. Deliver rewritten text directly

---

## The 33 Patterns

### Content Patterns (1-6)

**1. Significance Inflation**: Assigning outsized importance to ordinary things.

- Before: "This release marks a pivotal moment in the evolution of distributed systems."
- After: "This release changes how distributed systems handle state."

**2. Notability Name-Dropping**: Citing authorities without real references for credibility.

- Before: "As covered by the New York Times, BBC, and the Financial Times, the project gained traction."
- After: Remove citation entirely, or provide specific article title + date.

**3. Superficial -ing Analyses**: Stacking present-participle phrases claiming to interpret without saying anything.

- Before: "The design symbolizes strength, reflecting resilience, and showcasing innovation."
- After: "The design is sturdy and straightforward."

**4. Promotional Language**: Travel-brochure adjectives applied to products/features.

- Before: "Nestled within the breathtaking Swiss Alps, the data center offers world-class uptime."
- After: "The Swiss Alps data center has 99.99% uptime."

**5. Vague Attributions**: Unnamed experts/studies lending authority.

- Before: "Experts believe this approach plays a crucial role in modern architecture."
- After: Name the researchers, or omit.

**6. Formulaic Challenges Sections**: Boilerplate adversity-triumph narrative.

- Before: "Despite significant challenges, the team continues to thrive and push boundaries."
- After: Specify challenges, changes, outcomes. If unknown, omit.

---

### Language Patterns (7-13)

**7. AI Vocabulary**: Words overrepresented in LLM output.

| Avoid      | Use instead                |
| ---------- | -------------------------- |
| delve      | look into, examine         |
| tapestry   | mix, range, combination    |
| testament  | proof, sign, evidence      |
| vibrant    | lively, busy, active       |
| pivotal    | key, central, critical     |
| underscore | show, highlight, stress    |
| landscape  | field, space, area         |
| fostering  | building, growing          |
| garner     | get, earn, attract         |
| intricate  | complex, detailed          |
| elevate    | raise, improve             |
| holistic   | complete, full, end-to-end |

**8. Copula Avoidance**: Elaborate verbs where "is"/"has" works.

- Before: "The library serves as a unified interface." / "The dashboard boasts real-time metrics."
- After: "The library is a unified interface." / "The dashboard has real-time metrics."

**9. Negative Parallelisms**: "Not just X, it's Y" frames or tailing negations.

- Before: "It's not just a tool; it's a philosophy. No guessing required."
- After: "It is a workflow philosophy. The rules are explicit."

**10. Rule of Three**: Triplet lists chosen for rhythm, not completeness.

- Before: "We value innovation, inspiration, and insight."
- After: "We value clear thinking."

**11. Synonym Cycling**: Multiple words for the same referent in one passage.

- Before: "The protagonist...The main character...The central figure..."
- After: Pick one term. Use it throughout.

**12. False Ranges**: "From X to Y" where range communicates nothing.

- Before: "The framework handles everything from simple CRUD to distributed consensus."
- After: State actual supported operations.

**13. Passive Voice / Subjectless Fragments**: Removing the actor.

- Before: "No configuration file needed. Deployment is handled automatically."
- After: "You do not need a configuration file. The installer deploys the service."

---

### Style Patterns (14-22)

**14. Em/En Dashes**: Replace based on meaning: parenthetical=parentheses/commas, abrupt stop=period, colon relationship=colon.

- Before: "The system is fast -- even under load -- and reliable."
- After: "The system is fast (even under load) and reliable."

**15. Boldface Overuse**: Bold on every key noun instead of one critical term per section.

- Before: "**Performance** improved by **40%** after the **caching layer** was added."
- After: "Performance improved by 40% after the caching layer was added."

**16. Inline-Header Lists**: Bold label restated as prose.

- Before: "**Performance:** Performance improved significantly across all benchmarks."
- After: "Performance improved across all benchmarks."

**17. Title Case Headings**: Capitalize only first word + proper nouns.

- Before: "## Strategic Negotiations And Partnership Frameworks"
- After: "## Strategic negotiations and partnership frameworks"

**18. Emojis**: Remove all unless in original human text.

**19. Curly Quotes**: Replace with straight ASCII (" ').

**20. Chatbot Artifacts**: Pleasantry closings, offers of help, sign-offs. Omit entirely.

**21. Knowledge-Cutoff Disclaimers**: State actual limitation plainly or omit.

- Before: "As of my knowledge cutoff in early 2024..."
- After: "This was accurate in early 2024" or omit.

**22. Sycophantic Tone**: Complimenting the question before answering. Skip to the answer.

---

### Filler and Hedging (23-25)

**23. Filler Phrases**:

| Wordy                        | Concise         |
| ---------------------------- | --------------- |
| In order to                  | To              |
| Due to the fact that         | Because         |
| At this point in time        | Now             |
| In the event that            | If              |
| With regard to               | About           |
| It is important to note that | Note: (or omit) |
| For the purpose of           | To / For        |
| In terms of                  | In / Of / For   |
| On a daily basis             | Daily           |

**24. Excessive Hedging**: Stacking hedges that cancel out.

- Before: "This could potentially possibly improve performance in some cases."
- After: "This may improve performance."

**25. Generic Positive Conclusions**: Vague optimistic endings.

- Before: "The future looks bright for open-source AI tooling."
- After: State specific expected outcome, or end at last substantive point.

---

### More Patterns (26-33)

**26. Hyphenated Predicate Overuse**: Compound adjectives as accomplishments.

- Before: "Our approach is data-driven, cross-functional, and impact-focused."
- After: "We base decisions on data, share work across teams, and measure outcomes."

**27. Persuasive Authority Tropes**: Meta-commentary about what "really" matters.

- Before: "At its core, what really matters is delivering value to users."
- After: "Deliver value to users."

**28. Signposting Announcements**: Announcing you will begin instead of beginning.

- Before: "Let's dive in. Here's what you need to know about the new API."
- After: Start with first substantive sentence.

**29. Fragmented Headers**: Heading followed by restatement before real content.

- Before: "## Caching Strategy\nThis section covers our caching strategy in detail."
- After: "## Caching Strategy\n[First substantive sentence directly.]"

**30. Diff-Anchored Writing**: Describing behavior by comparing to previous version reader may not know.

- Before: "This function was added to replace the old synchronous version that blocked the event loop."
- After: "This function handles I/O asynchronously."

**31. Manufactured Punchlines**: Staccato fragments for dramatic effect.

- Before: "It had no preference. No prior. No nostalgia. It simply computed."
- After: "It computed without preference or prior state."

**32. Aphorism Formulas**: Abstract symmetry statements as insight.

- Before: "Symmetry is the language of trust."
- After: State the concrete claim, or delete.

**33. Conversational Rhetorical Openers**: Performative hedges delaying the answer.

- Before: "Honestly? It depends on your use case. Great question to ask."
- After: "It depends on your use case:" then list conditions.

---

## Delivery Format

```
### Audit

- [Pattern #N] Description of instance found and what was changed.
- [Pattern #N] ...

### Result

[Final rewritten text here, with no preamble.]
```
