---
description: Remove AI-writing patterns from any prose -- docs, PR descriptions, commit messages, README, comments. Invoked automatically when text sounds AI-generated or user asks to humanize writing.
argument-hint: "[text or file path to humanize]"
allowed-tools: Read, Write, Edit
context: fork
---

# Humanizer

Remove AI-generated writing patterns from any prose.

## Recent document changes in this repo

!`git diff HEAD -- "*.md" 2>/dev/null | head -200`

## Input

Text or file to humanize: $ARGUMENTS

## Process

1. Read the input in full.
2. Identify every instance of the 33 patterns below.
3. Draft a rewrite resolving all flagged instances.
4. Self-audit: ask "what still sounds AI-generated?" and list residual signals.
5. Final rewrite applying the self-audit corrections.
6. Deliver: audit bullets first, then the final text.

## Hard Constraints

- Zero em dashes (--) and en dashes (-). Replace with period, comma, colon, or parentheses.
- Zero curly/smart quotes. Use straight quotes.
- Zero emojis unless in the original.
- Never add content not in the original.

---

## The 33 Patterns

Apply all 33 humanizer patterns below:

**1. Significance Inflation** -- "marking a pivotal moment in the evolution of X" -> "changed how X works"

**2. Notability Name-Dropping** -- unverified "as seen in NYT, BBC" -> remove or cite specifically

**3. Superficial -ing Analyses** -- "symbolizing strength, reflecting resilience, showcasing innovation" -> pick the most accurate one or drop

**4. Promotional Language** -- "nestled within the breathtaking region of" -> specific factual description

**5. Vague Attributions** -- "Experts believe it plays a crucial role" -> name the experts or say "some researchers suggest"

**6. Formulaic Challenges Sections** -- "Despite challenges, X continues to thrive" -> specify the challenges and what specifically improved

**7. AI Vocabulary** -- Replace: delve -> look into; tapestry -> mix/range; testament -> proof; vibrant -> lively; pivotal -> key; underscore -> show; landscape -> field/area; fostering -> building; garner -> get/earn; intricate -> complex; elevate -> raise/improve; holistic -> complete/full

**8. Copula Avoidance** -- "serves as / stands as / boasts / features" instead of simple "is/has" -> revert to is/has

**9. Negative Parallelisms + Tailing Negations** -- "It's not just X, it's Y" / "no guessing required" -> rephrase as positive statement

**10. Rule of Three** -- "innovation, inspiration, and insights" -> pick one or two concrete items

**11. Synonym Cycling** -- protagonist/main character/central figure for same referent -> pick one and use it throughout

**12. False Ranges** -- "from the Big Bang to dark matter" (meaninglessly broad) -> specific accurate scope

**13. Passive Voice / Subjectless Fragments** -- "No configuration file needed" -> "You don't need a config file"

**14. Em/En Dashes** -- hard replace with period, comma, colon, or parentheses

**15. Boldface Overuse** -- bold only for genuinely critical terms, not every noun

**16. Inline-Header Lists** -- "**Performance:** Performance improved" -> "Performance improved"

**17. Title Case Headings** -- "Strategic Negotiations And Partnerships" -> "Strategic negotiations and partnerships"

**18. Emojis** -- remove unless in original human text

**19. Curly Quotes** -- replace with straight quotes

**20. Chatbot Artifacts** -- "I hope this helps! Let me know if..." -> omit

**21. Knowledge-Cutoff Disclaimers** -- "As of my knowledge cutoff..." -> state limitation plainly or omit

**22. Sycophantic Tone** -- "Great question! You're absolutely right!" -> skip to substance

**23. Filler Phrases** -- "In order to" -> "To"; "Due to the fact that" -> "Because"; "At this point in time" -> "Now"; "In the event that" -> "If"; "It is important to note that" -> "Note:" or omit

**24. Excessive Hedging** -- "could potentially possibly" -> "may"; "it is worth noting that" -> omit and lead with the fact

**25. Generic Positive Conclusions** -- "The future looks bright for X" -> specific outcome or omit

**26. Hyphenated Predicate Overuse** -- "our approach is data-driven, cross-functional" -> "we use data to decide / teams share the work"

**27. Persuasive Authority Tropes** -- "At its core, what really matters is..." -> state the point directly

**28. Signposting Announcements** -- "Let's dive in", "Here's what you need to know" -> start with the content

**29. Fragmented Headers** -- heading followed by one-line restatement before content -> merge or remove restatement

**30. Diff-Anchored Writing** -- "This function was added to replace the old X" -> describe current behavior only

**31. Manufactured Punchlines** -- "It had no preference. No prior. No nostalgia." (staccato drama) -> normal sentence

**32. Aphorism Formulas** -- "Symmetry is the language of trust" -> concrete statement or delete

**33. Conversational Rhetorical Openers** -- "Honestly? It depends..." -> "It depends on..."

---

## Delivery Format

```
### Audit

- [Pattern #N] What was found and fixed.

### Result

[Final rewritten text with no preamble.]
```
