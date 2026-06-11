# API Versioning Skill

This skill applies when designing, evolving, or maintaining APIs that are consumed by external clients, third-party integrators, or other internal services that cannot be updated in lockstep.

---

## Core Problem

APIs are contracts. Once a client depends on an API response shape, a field name, or a behaviour, changing it breaks that client. API versioning is the discipline of evolving an API while honouring existing contracts.

The key insight: the cost of a breaking change is not paid by the API producer — it is paid by every consumer. In public or widely-integrated APIs, a single breaking change can break thousands of clients.

---

## What Constitutes a Breaking Change

**Breaking — requires a new version:**

- Removing a field from a response
- Renaming a field (removing the old name)
- Changing a field's type (e.g., integer to string, string to array)
- Changing a field from optional to required in a request
- Removing an endpoint
- Changing an endpoint's URL path or HTTP method
- Changing authentication requirements on an endpoint
- Changing the meaning of an enum value
- Removing an enum value from a request field
- Changing error response codes in a way that breaks client error handling
- Adding a new required field to a request body

**Non-breaking — safe without a new version:**

- Adding a new optional field to a response
- Adding a new optional field to a request
- Adding a new endpoint
- Adding a new enum value to a response field (consumers must tolerate unknown values)
- Relaxing a validation rule (accepting inputs that were previously rejected)
- Improving error messages without changing the error code or structure
- Adding new HTTP headers to responses

**Handle with care:**

- Adding a new required field to a response — safe only if consumers are known to ignore unknown fields
- Changing default values of optional fields
- Changing rate limits or quota allocations

---

## Versioning Strategies

### URL Path Versioning

The version is embedded in the URL path: `/v1/users`, `/v2/users`.

**Pros:** Visible, cacheable, easy to test with a browser, unambiguous in logs.  
**Cons:** Requires routing changes for each version; URL is not a pure resource identifier (it conflates resource with representation version).

**When to use:** Public APIs where discoverability and cacheability matter. The industry default for REST APIs.

**Convention:**

- Use a major version number only: `/v1/`, `/v2/`
- Do not include patch or minor versions in the URL
- New versions introduce only when making breaking changes

### Header Versioning

The version is specified in a request header: `Accept: application/vnd.myapi.v2+json` or `API-Version: 2024-01-15`.

**Pros:** Keeps URLs clean; allows fine-grained content negotiation.  
**Cons:** Harder to test manually; less visible in logs and browser tools; requires clients to set headers correctly.

**When to use:** Internal APIs between services where client control is high. GraphQL APIs that version by capability rather than URL.

### Date-Based Versioning

The version is a date representing the API contract in effect on that date: `Stripe-Version: 2024-01-15`.

**Pros:** Semantically clear — clients pin to a specific date and the API they receive will not change; easy to document what changed between dates.  
**Cons:** Implementation complexity; requires careful documentation of each dated contract.

**When to use:** APIs with frequent additions and occasional breaking changes where clients need precise control (Stripe's approach).

---

## Version Lifecycle Management

### Introducing a New Version

1. Define the breaking change clearly — what is different, and why
2. Implement the new version alongside the old version (do not remove the old one immediately)
3. Document the migration path: what clients must change to move from v1 to v2
4. Announce the new version and deprecation of the old version with a timeline

### Deprecation

- Announce deprecation with a minimum notice period: 6 months for external APIs; discuss with internal consumers for internal APIs
- Add a `Deprecation` response header to deprecated endpoints: `Deprecation: Sun, 01 Jun 2025 00:00:00 GMT`
- Add a `Sunset` response header with the removal date: `Sunset: Mon, 01 Dec 2025 00:00:00 GMT`
- Include deprecation notices in documentation, changelogs, and API responses
- Track which clients are still using deprecated versions (use API keys or user agents to identify callers)
- Contact known heavy users of deprecated versions directly before removal

### Sunsetting

- Remove a deprecated version only after the announced sunset date
- Before removal, confirm no clients are still calling the deprecated version (check access logs)
- If clients are still calling after the sunset date, contact them before removal
- After removal, return a clear error (410 Gone with a migration guide in the body) rather than 404, for a grace period

---

## API Design for Changeability

The best versioning strategy is one you rarely need. Design APIs to be resilient to evolution:

### Additive-First Design

Design responses to carry more information than clients currently need. Clients should be written to ignore unknown fields. This allows adding fields to responses without breaking existing clients.

### Enum Extensibility

Response fields that contain enum values must be treated as open sets by clients. Document this explicitly. If a field can only ever contain a fixed set of values, say so — otherwise, clients must handle unexpected values gracefully (not crash, not reject the response).

### Nullable vs. Required vs. Optional

Be explicit about which response fields are guaranteed to be present, which may be null, and which may be absent. A field that is sometimes absent and sometimes null behaves differently in statically-typed clients. Prefer consistent presence with nullable values over fields that appear and disappear.

### Avoid Semantically Overloaded Fields

Do not reuse a field for a new purpose in a later version. If `type` meant "subscription plan" and now you want it to mean "account type", add a new field `account_type` rather than changing the meaning of `type`.

### Pagination from the Start

If a list endpoint might ever return more results than fit in one response, add pagination from day one. Retrofitting pagination is a breaking change (changing the response from an array to a paginated envelope).

### Error Response Consistency

Define an error response schema and use it consistently across all endpoints and versions:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [...]
  }
}
```

Clients write error handling code once and it works everywhere. Inconsistent error shapes are a common source of client bugs.

---

## API Versioning Checklist

When introducing a change to an existing API:

- [ ] Change classified as breaking or non-breaking
- [ ] If breaking: new version introduced rather than modifying the existing contract
- [ ] If breaking: migration guide written for consumers
- [ ] If breaking: deprecation announced with sunset date
- [ ] Deprecation headers added to old version responses
- [ ] Documentation updated for new version
- [ ] Changelog entry written describing what changed and why
- [ ] Old version retained alongside new version for the deprecation period
- [ ] Consumers of the old version identified and notified
- [ ] Sunset monitoring in place to catch consumers still on deprecated versions
- [ ] Response schema is additive where possible
- [ ] Error response follows the established schema
