---
applyTo: "**/agents/**,**/prompts/**,**/chains/**,**/graphs/**,**/llm/**,**/ai/**,**/rag/**,**/evaluation/**"
---

<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->
<!-- Source: shared/rules/ai-development.md -->
<!-- Regenerate with: scripts/sync-dotfiles.sh -->

# AI/ML Development Rules

These rules govern the design, implementation, evaluation, and operation of AI and machine learning agents, pipelines, and models in this repository.

---

## Agent Classification

Before beginning implementation, classify the agent correctly. The classification determines the approved tooling, infrastructure, and testing requirements.

### Workflow Agents

Agents that execute structured, goal-directed tasks as part of a larger process.

| Subtype       | Description                                                              | Approved Tooling                               |
| ------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| Traditional   | Rule-based or scripted workflow with deterministic branching             | Python, standard libraries                     |
| LLM-augmented | Workflow with one or more LLM calls at specific decision points          | LangGraph, Azure AI Foundry                    |
| Agentic       | LLM drives the control flow; tools are selected and invoked autonomously | LangGraph, MCP, Azure AI Foundry Agent Service |

### Conversational Agents

Agents that interact with users through natural language over multiple turns.

| Subtype       | Description                                                      | Approved Tooling                          |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Chatbot       | Scripted or intent-based dialogue with fixed response paths      | Dialogflow CX, Copilot Studio             |
| LLM-augmented | Intent recognition backed by an LLM; responses may be generative | Copilot Studio, Vertex AI Agent Builder   |
| Agentic       | LLM manages the conversation, retrieves context, and calls tools | LangGraph, Azure AI Foundry Agent Service |

---

## Procode Agent Standards

Procode agents are implemented in Python using approved frameworks.

### Required Frameworks

- **Orchestration:** LangGraph is the default framework for all procode agents. Deviations require written approval and must be documented in an Architecture Decision Record.
- **Tool integration:** Use the Model Context Protocol (MCP) to expose tools to agents. Do not pass tools as raw Python callables in production agents.
- **Inter-agent communication:** Use Agent-to-Agent (A2A) protocol for communication between separately deployed agents.
- **Runtime:** Azure AI Foundry Agent Service for hosted agent execution.

### Memory

| Memory Type             | Storage Backend                                           |
| ----------------------- | --------------------------------------------------------- |
| Short-term memory (STM) | Redis                                                     |
| Long-term memory (LTM)  | Azure AI Search (vector) and Azure Cosmos DB (structured) |

Short-term memory expires with the session. Long-term memory persists across sessions and must be scoped to the user or tenant.

### Test Coverage

Procode agents must maintain a minimum of 80% test coverage. This applies to agent logic, tool implementations, memory operations, and prompt rendering functions.

---

## Declarative Agent Standards

Declarative agents are configured through platform tools rather than code.

| Platform                       | Approved use case                                                      |
| ------------------------------ | ---------------------------------------------------------------------- |
| Microsoft Copilot Studio       | Microsoft 365 integration, Teams bots, Power Platform workflows        |
| Google Vertex AI Agent Builder | Google Cloud-hosted conversational agents                              |
| Google Dialogflow CX           | Complex multi-turn conversational flows with explicit state management |

Declarative agent configurations must be committed to version control as exported JSON or YAML. Do not manage declarative agents solely through the platform UI without a versioned export in the repository.

---

## Model Management

### Approved Model Catalogs

- **Primary:** Azure AI Foundry model catalog
- **Secondary:** Google Vertex AI model catalog

Models from Hugging Face require written approval from the AI lead and a security review before use in production. The approval must be documented in an ADR.

### AI Gateway

All model API calls in production must route through an AI Gateway:

- **Azure:** Azure API Management (APIM) with the AI Gateway policy set
- **Google Cloud:** Apigee with rate limiting and authentication policies

Direct calls to model provider APIs from application code are forbidden in production deployments. The gateway enforces rate limiting, token budgets, logging, and authentication centrally.

---

## Prompt Engineering

### Structure

All prompts must follow the RTCF structure:

| Component   | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| **Role**    | Define the persona and expertise the model should adopt        |
| **Task**    | State the specific task to be completed                        |
| **Context** | Provide background information, constraints, and relevant data |
| **Format**  | Specify the expected output format, length, and structure      |

### Naming Convention

Prompt files must follow this naming pattern:

```
<agent_name>_<task_name>_<version>.md
```

Examples:

- `document_review_summarise_v1.md`
- `support_triage_classify_v2.md`

### Versioning

- Prompts are versioned using a monotonically increasing integer suffix (`v1`, `v2`, etc.).
- Prompt files are stored in Azure Blob Storage for production deployments and committed to Git for review and change tracking.
- The version in use by each deployed agent must be recorded in the agent's configuration.

### Lifecycle Phases

| Phase          | Description                                            |
| -------------- | ------------------------------------------------------ |
| Draft          | Prompt is under authorship; not yet evaluated          |
| Experiment     | Prompt is being evaluated against the golden dataset   |
| Pre-production | Prompt has passed evaluation; deployed to CERT/staging |
| Production     | Prompt is live; monitored for drift and quality        |
| Deprecated     | Prompt has been replaced; retained for audit purposes  |

Promote a prompt to the next phase only after the evaluation criteria for the current phase are met and a human reviewer has approved the promotion.

---

## Evaluation

### Golden Dataset

Every agent must have a golden dataset for evaluation before it is deployed to production.

Requirements:

- Minimum 20 test cases per agent.
- Distribution: 60% direct questions (single-hop), 30% multi-hop questions (requiring reasoning over multiple pieces of context), 10% edge cases (ambiguous input, out-of-scope, adversarial).
- Each case includes: input, expected output, and the ground truth source used to verify the answer.
- The golden dataset is committed to the repository and updated when the agent scope changes.

### Evaluation Metrics

Select the metrics appropriate to the agent's task type:

**Question Answering**

| Metric       | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| Token F1     | Token overlap between predicted and reference answer        |
| BERTScore    | Semantic similarity using contextual embeddings             |
| LLM-as-Judge | A separate LLM rates the answer quality on a defined rubric |

**Summarisation**

| Metric    | Description                                               |
| --------- | --------------------------------------------------------- |
| ROUGE-L   | Longest common subsequence overlap with reference summary |
| BERTScore | Semantic similarity to reference summary                  |

**Classification**

| Metric    | Description                                   |
| --------- | --------------------------------------------- |
| Precision | True positives divided by predicted positives |
| Recall    | True positives divided by actual positives    |
| F1        | Harmonic mean of precision and recall         |

**Retrieval-Augmented Generation (RAG)**

| Metric       | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| Faithfulness | Whether the generated answer is grounded in the retrieved context |
| BERTScore    | Semantic similarity between generated answer and reference        |

### Operational Metrics

In addition to quality metrics, track operational metrics in production:

| Metric                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| Latency (p50, p95, p99) | Time from request receipt to response delivered |
| Cost per request        | Total token cost normalised per request         |
| Error rate              | Percentage of requests that result in an error  |

### Evaluation Lifecycle

| Stage          | Trigger                                    | Acceptance Criterion                                         |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Initial        | First deployment of a new agent            | All quality metrics meet the defined baseline                |
| Experiment     | Prompt or model change                     | Quality metrics do not regress from the previous passing run |
| Pre-production | Promotion from experiment                  | Human reviewer approves evaluation report                    |
| Production     | Ongoing, after each model or prompt update | Automated regression check; alert on degradation             |

---

## AI Security

### Content Safety

All user-facing agents must route input and output through Azure AI Content Safety or an equivalent content moderation API. Configure safety categories (hate, self-harm, violence, sexual) at the threshold appropriate for the target audience. Log content safety decisions without logging the full user input.

### Guardrails

Implement guardrails at the application layer in addition to model-level safety:

- Validate that agent outputs conform to the expected schema before returning them to callers.
- Reject or escalate responses that the content safety layer flags.
- Implement a circuit breaker: if the model returns malformed output on three consecutive requests, stop calling it and return a degraded response.

### Prompt Injection Prevention

- Never concatenate raw user input directly into a system prompt.
- Separate system instructions from user-provided content using explicit delimiters that the model is instructed to treat as boundaries.
- Validate that user input does not contain delimiter strings before inserting it into the prompt.
- Test agents against a prompt injection test suite as part of the evaluation pipeline.

### Logging Restrictions

- Never log the full text of a user's message in a conversational agent; log a hash or truncated prefix for debugging purposes only.
- Never log the full system prompt; log only the prompt name and version.
- Log model responses at `debug` level only and ensure `debug` is disabled in production by default.

### AI Gateway Policies

Configure the following policies at the AI Gateway layer:

- Rate limiting per user and per tenant to prevent runaway token consumption.
- Token budget enforcement: reject requests that would exceed the configured token limit.
- Request and response logging to the audit log (with sensitive field masking).
- Authentication: all requests must carry a valid identity token; anonymous calls are rejected.

### Data Classification

Use Microsoft Purview to classify data that flows through AI pipelines. Data classified as Confidential or above must not be sent to external model providers without explicit approval and a documented data processing agreement.

---

## Code Review Gate

Before marking any change as complete, verify each item in the checklist below.
If this file is in the `applyTo` scope of this instruction file, these checks are mandatory.

- [ ] All rules in this file have been applied to the changed code
- [ ] No rule has been selectively ignored without a documented reason
- [ ] Pre-commit hooks pass locally
- [ ] The change has been tested against the scenarios described in the rules above
