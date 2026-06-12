---
applyTo: "**/agents/**,**/prompts/**,**/chains/**,**/graphs/**,**/llm/**,**/ai/**,**/rag/**,**/evaluation/**"
---

# AI Development Rules

These rules apply to all agent, prompt, chain, graph, LLM integration, RAG, and evaluation code. All general engineering standards from `copilot-instructions.md` and `python.instructions.md` apply in full. The rules in this file extend those standards with AI-specific requirements.

---

## 1. Framework Standards

**LangGraph** is the default and required framework for all agent and multi-step workflow implementations. Justify any deviation from LangGraph in an Architecture Decision Record before implementation.

**MCP (Model Context Protocol)** is the required standard for integrating external tools and data sources into agents. Do not implement bespoke tool-calling wrappers when MCP is applicable.

**A2A (Agent-to-Agent)** protocol is required for all inter-agent communication in multi-agent systems. Direct HTTP calls between agents are not permitted.

All model traffic must route through the designated AI Gateway (Azure APIM for Azure-hosted workloads). Direct calls from application code to model provider APIs that bypass the gateway are prohibited in production.

---

## 2. Agent Classification

Classify every agent on two axes before implementation. The classification determines the required memory architecture, error handling strategy, and evaluation approach.

### Interaction type

| Type           | Description                                              |
| -------------- | -------------------------------------------------------- |
| Workflow       | Executes a fixed sequence of steps triggered by an event |
| Conversational | Maintains dialogue state across multiple user turns      |

### Decision mechanism

| Type        | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| Traditional | Rule-based logic with no LLM involvement in routing decisions           |
| LLM-based   | Uses an LLM for classification or routing, with deterministic execution |
| Agentic     | LLM autonomously selects actions and tools; execution path varies       |

Document the classification in the agent module's module-level docstring.

---

## 3. Memory Architecture

| Scope      | Storage                      | Use case                                                 |
| ---------- | ---------------------------- | -------------------------------------------------------- |
| Short-term | Redis                        | Conversation state, session context, in-flight task data |
| Long-term  | Azure AI Search or Cosmos DB | User preferences, knowledge bases, historical context    |

Implement memory read and write as explicit graph nodes in LangGraph. Do not read or write memory as side effects inside action nodes.

Define a TTL for all short-term memory entries. Do not allow Redis keys to grow unbounded.

---

## 4. Prompt Engineering

### Structure

All production prompts must follow the RTCF structure:

1. **Role** — The persona or expertise the model should adopt.
2. **Task** — The specific action the model must perform.
3. **Context** — Background information required to complete the task correctly.
4. **Format** — The required output format, schema, or constraints.

### Naming Convention

Name prompt files and variables descriptively using the pattern `<domain>_<action>_<version>`:

- `order_extraction_v1`
- `sentiment_classification_v2`
- `document_summary_v1`

### Versioning

Prompts are code. They must be versioned, reviewed, and tested like any other code artifact. Store prompts in the `prompts/` directory, not inline in calling code. Use templating (Jinja2 or equivalent) — never string concatenation at runtime. Increment the version suffix when changing a prompt's wording, structure, or output schema.

---

## 5. Evaluation Pipelines

Evaluation pipelines are mandatory for all production agents and chains before promotion beyond the development environment.

### Golden Dataset

- Minimum 20 representative cases per agent or chain.
- Cases must cover happy path, edge cases, and known failure modes.
- Golden datasets require human curation. AI-generated datasets are permitted as a starting point only; a human must review and approve every case.
- Store golden datasets under `evaluation/datasets/` in version control.
- Pin the dataset version alongside the model version in evaluation run metadata.

### Metrics

Choose metrics appropriate to the task type. Document the chosen metrics in the evaluation configuration.

| Task type               | Required metrics                                         |
| ----------------------- | -------------------------------------------------------- |
| Question answering      | Faithfulness, answer relevance, context recall           |
| Summarization           | Rouge-L, factual consistency, conciseness                |
| Classification          | Accuracy, precision, recall, F1                          |
| Code generation         | Pass@k, compilation success rate, test pass rate         |
| Multi-step reasoning    | Step accuracy, final answer accuracy, hallucination rate |
| Latency-sensitive tasks | p50/p95/p99 latency alongside accuracy metrics           |

### Lifecycle

1. Define metrics and golden dataset before writing agent code.
2. Run evaluation after every significant prompt or graph change.
3. Regressions in evaluation scores block promotion to integration, certification, and production environments without explicit sign-off from the owning team lead.
4. Evaluation runs must be reproducible. Pin model versions, dataset versions, and metric definitions in run metadata.

---

## 6. LangGraph Implementation Standards

### Graph Structure

- Define each logical step as a discrete, named node.
- Nodes must be pure functions or async functions with a single responsibility.
- State transitions must be explicit edges. Do not use implicit control flow or side effects to move between nodes.
- Define the state schema as a typed `TypedDict` or Pydantic model.

### Error Handling in Graphs

- Define an explicit error node for recoverable failures. Route to it from any node that may fail.
- Unrecoverable errors must propagate as typed exceptions, not be swallowed inside nodes.
- Log the node name and graph state summary at `error` level when a node fails.
- Include retry logic with exponential backoff for nodes that call external services.

### Checkpointing

- Use LangGraph's checkpointer for all conversational agents to enable resume on failure.
- Store checkpoints in the project's configured persistence backend (Redis for short-lived, Cosmos DB for durable).

---

## 7. LLM Call Standards

- Always set an explicit `timeout` on every LLM call.
- Always specify `max_tokens` to prevent runaway completions.
- Log `model`, `prompt_tokens`, `completion_tokens`, and `latency_ms` as structured fields on every LLM call. Do not log the prompt or completion content.
- Emit an OpenTelemetry span for every LLM call with the same fields as attributes.
- Use structured output (JSON mode or response schema) wherever the downstream code parses the model response. Validate the parsed output against a Pydantic model.

```python
response = await client.chat.completions.create(
    model=settings.azure_openai_deployment,
    messages=messages,
    max_tokens=512,
    response_format={"type": "json_object"},
    timeout=30.0,
)
```

---

## 8. RAG Implementation

- Chunk documents at the logical boundary (paragraph, section, sentence) appropriate to the domain. Document the chunking strategy.
- Store chunk metadata (source document, section, page, creation date) alongside embeddings in the vector store.
- Re-rank retrieved chunks using a cross-encoder or LLM-based relevance score before passing to the generation step.
- Validate that retrieved context is sufficient before invoking the LLM. If no relevant context is found, return a structured "insufficient context" response rather than hallucinating.
- Attribute every generated statement to its source chunk in the response where the use case permits.

---

## 9. Security

- Integrate **Azure AI Content Safety** at both the input and output boundaries of every user-facing agent. This is not optional.
- Implement input guardrails before any user content reaches the LLM. Implement output guardrails before any LLM response reaches the user.
- Treat all user-supplied content as untrusted. Sanitize before including in prompts. Do not allow prompt injection through user content.
- Never expose raw model error messages to end users. Log them internally and return a sanitized response.
- Conduct a threat model review for any agent that can take actions with side effects (file writes, API calls, database mutations, email sending).
- Do not log full prompt content, full completion content, or user inputs that may contain PII.
- Apply the principle of least privilege to all tool permissions granted to an agent.

---

## 10. Testing AI Code

Agent and chain code is subject to the same 80% coverage requirement as all other code.

- Unit-test each node function in isolation with mocked LLM responses.
- Unit-test each tool function in isolation.
- Integration-test the full graph against a stubbed or sandboxed LLM backend. Do not mock the LLM in integration tests unless the test is explicitly validating retry or error-handling behavior.
- Acceptance-test end-to-end agent behavior against the evaluation golden dataset.
- Use `pytest-recording` or equivalent to record and replay LLM responses in unit tests for determinism.
- Test all error paths: LLM timeout, LLM content filter rejection, tool failure, state schema validation failure.
