---
name: api-versioning
description: Semantic API versioning, backward compatibility rules, breaking change detection, deprecation workflows, migration guides, and changelog formats for APIs. Use when designing API versions, adding endpoints, deprecating features, handling breaking changes, or documenting API evolution.
---

# API Versioning Standards

This skill provides a complete reference for versioning RESTful and GraphQL APIs in an enterprise environment — from initial version numbering through deprecation and sunset.

---

## 1. Version Numbering Scheme

### Semantic Versioning for APIs

APIs follow a simplified semantic version: **MAJOR.MINOR** (no patch — bugs are fixed in-place without a version bump).

| Component | When to Increment                                 | Examples                                 |
| --------- | ------------------------------------------------- | ---------------------------------------- |
| **MAJOR** | Breaking changes that require client code changes | `v1 → v2`                                |
| **MINOR** | Additive changes (backward compatible)            | Not exposed in URL; tracked in changelog |

**Rule**: Minor versions do NOT get their own URL. Only MAJOR versions appear in the URL path or header. Minor additions are automatically available on the current major version.

```
v1.0  → new endpoint added → v1.1 (same URL /v1)
v1.1  → breaking change   → v2.0 (new URL /v2)
v2.0  → optional field added → v2.1 (same URL /v2)
```

---

## 2. URL Versioning vs. Header Versioning

### URL Versioning (Preferred for Public APIs)

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

**Pros**: Visible, cacheable, easy to test in browser, simple routing.
**Cons**: Pollutes URL structure; different versions = different resources (semantically debatable).

**Use for**: Public APIs, third-party integrations, mobile app APIs.

### Header Versioning (Preferred for Internal APIs)

```
GET /users
Accept: application/vnd.example.v2+json
-- or --
API-Version: 2024-06-11
```

**Pros**: Clean URLs, version is a metadata concern not a resource concern.
**Cons**: Harder to test without tools; not cacheable by default CDN configs.

**Use for**: Internal microservice APIs, when you control all clients.

### Date-Based Versioning (Stripe pattern)

```
Stripe-Version: 2024-01-01
```

**Pros**: Extremely granular; clients pin to a specific API behaviour snapshot.
**Cons**: Complex to maintain; many concurrent versions live simultaneously.

**Use for**: APIs with very long-lived clients (financial, legal integrations).

### Enterprise Decision Rule

> Use **URL versioning** for any API consumed by third parties or mobile apps.
> Use **header versioning** for internal service-to-service APIs.
> Document the strategy in your API reference and never mix strategies within a single API.

---

## 3. Backward Compatibility Rules

### What IS Backward Compatible (safe to ship without version bump)

- ✅ Adding a new endpoint
- ✅ Adding a new optional field to a request body
- ✅ Adding a new field to a response body
- ✅ Adding a new value to an enum (but clients must handle unknown enum values!)
- ✅ Adding a new HTTP method to an existing resource
- ✅ Increasing rate limits
- ✅ Fixing a bug that corrects incorrect behaviour clients rely on (document carefully)
- ✅ Adding a new optional query parameter

### What is NOT Backward Compatible (requires MAJOR version bump)

- ❌ Removing or renaming a field in a request or response
- ❌ Changing the type of a field (string → integer, object → array)
- ❌ Making an optional field required
- ❌ Removing an endpoint
- ❌ Changing the semantic meaning of a field (e.g., `amount` changes from dollars to cents)
- ❌ Changing authentication mechanism
- ❌ Removing a previously accepted enum value from inputs
- ❌ Changing error codes for existing scenarios
- ❌ Changing URL structure or HTTP method for an existing action
- ❌ Reducing rate limits significantly

### The "Tolerant Reader" Requirement

Clients MUST be written as Tolerant Readers:

- Ignore unknown fields in responses (don't error on new fields)
- Handle unknown enum values gracefully (use a default/unknown variant)
- Never assume a response field is absent because it's optional

Document this requirement explicitly in your API onboarding guide.

---

## 4. Breaking Change Detection

### Automated Detection

Use one of the following tools in CI to catch breaking changes automatically:

| Tool                  | Best For               | How                                                     |
| --------------------- | ---------------------- | ------------------------------------------------------- |
| **oasdiff**           | OpenAPI / Swagger      | `oasdiff breaking old.yaml new.yaml`                    |
| **openapi-diff**      | OpenAPI                | `openapi-diff --fail-on-incompatible old.json new.json` |
| **Spectral**          | Linting + custom rules | Custom ruleset for breaking change patterns             |
| **GraphQL Inspector** | GraphQL                | `graphql-inspector diff old.graphql new.graphql`        |
| **Buf**               | Protobuf / gRPC        | `buf breaking --against .git#branch=main`               |

### CI Pipeline Rule

```yaml
# .github/workflows/api-compatibility.yml
- name: Check API backward compatibility
  run: |
    oasdiff breaking api/openapi-main.yaml api/openapi.yaml --fail-on-err
```

If the check fails, the PR author must either:

1. Justify why the breaking change is intentional (and create a new major version)
2. Revert the change to maintain compatibility

### Manual Review Checklist

Before merging any API change, review:

```
[ ] No existing response fields removed or renamed
[ ] No existing request fields made required (were optional)
[ ] No field types changed
[ ] No endpoints removed (only deprecated first)
[ ] Enum expansions are additive only (no values removed)
[ ] HTTP status codes for existing paths unchanged
[ ] Error response shapes unchanged
```

---

## 5. Deprecation Workflow

### Deprecation Lifecycle

```
Active → Deprecated → Sunset
```

| Stage          | Duration                                     | What Happens                  |
| -------------- | -------------------------------------------- | ----------------------------- |
| **Active**     | Indefinite                                   | Normal support                |
| **Deprecated** | Minimum 6 months (12 for major integrations) | Still works; warnings added   |
| **Sunset**     | Post-sunset                                  | Returns 410 Gone or redirects |

### Step 1: Announce Deprecation

At the moment a feature is deprecated:

1. Add `Deprecation` and `Sunset` response headers to affected endpoints.
2. Add a deprecation notice to the API documentation.
3. Email/notify registered API consumers.
4. Add a `deprecated: true` field to the OpenAPI spec.

```http
HTTP/1.1 200 OK
Deprecation: Sat, 01 Jan 2025 00:00:00 GMT
Sunset: Sun, 01 Jul 2025 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

### Step 2: OpenAPI Annotation

```yaml
# openapi.yaml
paths:
  /v1/users:
    get:
      deprecated: true
      description: |
        **DEPRECATED**: This endpoint is deprecated as of 2025-01-01.
        It will be removed on 2025-07-01.

        **Migration**: Use `GET /v2/users` instead.
        See the [migration guide](https://docs.example.com/api/migration/v1-to-v2).
```

### Step 3: Sunset — Return 410

After the sunset date, replace the endpoint implementation with:

```typescript
app.get("/v1/users", (req, res) => {
  res.status(410).json({
    error: {
      code: "ENDPOINT_SUNSET",
      message:
        "This endpoint was sunset on 2025-07-01. Please migrate to /v2/users.",
      docsUrl: "https://docs.example.com/api/migration/v1-to-v2",
    },
  });
});
```

---

## 6. Migration Guides

Every breaking change must ship with a migration guide. Structure:

````markdown
# Migration Guide: v1 to v2

## Overview

v2 of the Example API introduces <summary of major changes>.
This guide covers all breaking changes and how to update your integration.

**Deprecation date**: 2025-01-01
**Sunset date**: 2025-07-01

---

## Breaking Changes

### 1. User object: `name` field split into `firstName` and `lastName`

**v1 response:**

```json
{
  "id": "usr_123",
  "name": "Jane Smith"
}
```
````

**v2 response:**

```json
{
  "id": "usr_123",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Migration steps:**

1. Update your deserialization to read `firstName` and `lastName`.
2. Concatenate them where you previously used `name`: `${user.firstName} ${user.lastName}`.

---

### 2. Pagination: cursor-based replaces offset-based

**v1 (offset):**

```
GET /v1/users?page=2&perPage=25
```

Response includes: `{ "data": [...], "meta": { "total": 100, "page": 2 } }`

**v2 (cursor):**

```
GET /v2/users?limit=25&after=cursor_abc123
```

Response includes: `{ "data": [...], "meta": { "hasNextPage": true, "endCursor": "cursor_xyz" } }`

**Migration steps:**

1. Remove `page` and `perPage` from your requests.
2. Add `limit` (max 100).
3. For the first request, omit `after`. For subsequent pages, use the `endCursor` from the previous response as `after`.

---

## Non-Breaking Additions

The following new features are available in v2 but do not require migration:

- `GET /v2/users/:id/audit-log` — new endpoint
- `filters.createdAfter` — new optional query parameter

---

## Support

Questions about migration? Contact support@example.com or open a ticket.

````

---

## 7. Changelog Format for APIs

Maintain a dedicated `CHANGELOG.md` (or `CHANGELOG_API.md`) following **Keep a Changelog** format, extended with API-specific sections.

```markdown
# API Changelog

All notable changes to the Example API are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).
Dates are UTC. Breaking changes are marked 🔴.

---

## [v2.3] — 2024-06-11

### Added
- `GET /v2/users/:id/sessions` — list active sessions for a user
- `DELETE /v2/users/:id/sessions` — revoke all sessions
- Optional `includeDeleted` query parameter on `GET /v2/users`

### Changed
- `PATCH /v2/users/:id` now accepts partial updates (previously required all fields)
- Rate limits on `GET /v2/users` increased from 100/min to 500/min

### Fixed
- `GET /v2/orders` no longer returns cancelled orders in the default response

### Security
- Added `Content-Security-Policy` header to all responses

---

## [v2.0] — 2024-01-01 🔴 MAJOR VERSION (BREAKING)

### 🔴 Breaking Changes
- `name` field on User split into `firstName` and `lastName` (see migration guide)
- Pagination changed from offset to cursor-based (see migration guide)
- `GET /v1/users/search` removed (use `GET /v2/users?q=` instead)
- Error response shape changed: `error.msg` → `error.message`

### Added
- Full migration guide at https://docs.example.com/api/migration/v1-to-v2
- Cursor-based pagination on all list endpoints
- `Deprecation` and `Sunset` headers on v1 endpoints

### Deprecated
- All v1 endpoints (sunset date: 2025-07-01)

---

## [v1.5] — 2023-09-15

### Added
- `GET /v1/users/:id/preferences` — new endpoint
- Optional `role` filter on `GET /v1/users`
````

---

## 8. Version Support Matrix

Maintain a published support matrix so clients can plan migrations:

| Version | Status     | Released   | Deprecated | Sunset     |
| ------- | ---------- | ---------- | ---------- | ---------- |
| v3      | **Active** | 2025-01-01 | —          | —          |
| v2      | Deprecated | 2024-01-01 | 2025-01-01 | 2025-12-31 |
| v1      | Sunset     | 2022-06-01 | 2024-01-01 | 2025-07-01 |

Publish this table at `GET /versions` or in the developer portal.
