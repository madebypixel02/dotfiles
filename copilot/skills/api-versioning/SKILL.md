---
name: api-versioning
description: Semantic API versioning, backward compatibility rules, breaking change detection, deprecation workflows, migration guides, and changelog formats for APIs. Use when designing API versions, adding endpoints, deprecating features, handling breaking changes, or documenting API evolution.
---

# API Versioning Standards

API versioning reference: numbering, compatibility, deprecation, sunset.

---

## 1. Version Numbering

APIs use **MAJOR.MINOR** (no patch; bugs fixed in-place).

| Component | Increment when                            | Example                          |
| --------- | ----------------------------------------- | -------------------------------- |
| **MAJOR** | Breaking changes requiring client updates | `v1 -> v2`                       |
| **MINOR** | Additive, backward-compatible changes     | Not in URL; tracked in changelog |

Minor versions share the major URL. Only MAJOR appears in URL path or header.

```
v1.0  -> new endpoint added -> v1.1 (same URL /v1)
v1.1  -> breaking change   -> v2.0 (new URL /v2)
v2.0  -> optional field added -> v2.1 (same URL /v2)
```

---

## 2. URL vs Header Versioning

### URL Versioning (public APIs)

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

Visible, cacheable, easy to test. Pollutes URL structure. Use for public APIs, third-party integrations, mobile apps.

### Header Versioning (internal APIs)

```
GET /users
Accept: application/vnd.example.v2+json
-- or --
API-Version: 2024-06-11
```

Clean URLs, version as metadata. Harder to test, not cacheable by default CDN. Use for internal microservice APIs.

### Date-Based (Stripe pattern)

```
Stripe-Version: 2024-01-01
```

Granular; clients pin to specific API snapshot. Complex to maintain. Use for long-lived clients (financial, legal).

### Decision Rule

> URL versioning for APIs consumed by third parties or mobile apps.
> Header versioning for internal service-to-service.
> Never mix strategies within a single API.

---

## 3. Backward Compatibility

### Compatible (no version bump)

- Adding new endpoint, HTTP method, optional query param, optional request field, response field
- Adding new enum value (clients must handle unknown values)
- Increasing rate limits
- Bug fix correcting wrong behaviour (document carefully)

### Breaking (requires MAJOR bump)

- Removing/renaming request or response field
- Changing field type (string -> integer, object -> array)
- Making optional field required
- Removing endpoint or enum value from inputs
- Changing field semantics (e.g., `amount` dollars -> cents)
- Changing auth mechanism, error codes, URL structure, HTTP method
- Significantly reducing rate limits

### Tolerant Reader Requirement

Clients MUST: ignore unknown response fields, handle unknown enum values with default/unknown variant, never assume optional fields are absent. Document in API onboarding guide.

---

## 4. Breaking Change Detection

### Automated (CI)

| Tool                  | Target            | Command                                                 |
| --------------------- | ----------------- | ------------------------------------------------------- |
| **oasdiff**           | OpenAPI / Swagger | `oasdiff breaking old.yaml new.yaml`                    |
| **openapi-diff**      | OpenAPI           | `openapi-diff --fail-on-incompatible old.json new.json` |
| **Spectral**          | OpenAPI + custom  | Custom ruleset for breaking change patterns             |
| **GraphQL Inspector** | GraphQL           | `graphql-inspector diff old.graphql new.graphql`        |
| **Buf**               | Protobuf / gRPC   | `buf breaking --against .git#branch=main`               |

```yaml
# .github/workflows/api-compatibility.yml
- name: Check API backward compatibility
  run: |
    oasdiff breaking api/openapi-main.yaml api/openapi.yaml --fail-on-err
```

On failure: justify breaking change + create new major version, or revert.

### Manual Review Checklist

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

Lifecycle: `Active -> Deprecated -> Sunset`

| Stage          | Duration                                 | Action                        |
| -------------- | ---------------------------------------- | ----------------------------- |
| **Active**     | Indefinite                               | Normal support                |
| **Deprecated** | Min 6 months (12 for major integrations) | Still works; warnings added   |
| **Sunset**     | Post-sunset                              | Returns 410 Gone or redirects |

### Step 1: Announce

1. Add `Deprecation` and `Sunset` response headers
2. Add deprecation notice to API docs
3. Notify registered consumers
4. Set `deprecated: true` in OpenAPI spec

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

### Step 3: Sunset (410)

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

Every breaking change ships with a migration guide:

````markdown
# Migration Guide: v1 to v2

## Overview

v2 of the Example API introduces <summary of major changes>.

**Deprecation date**: 2025-01-01
**Sunset date**: 2025-07-01

---

## Breaking Changes

### 1. User object: `name` split into `firstName` and `lastName`

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

**Migration**: Read `firstName` + `lastName`; concatenate where you used `name`.

---

### 2. Pagination: cursor-based replaces offset-based

**v1 (offset):**

```
GET /v1/users?page=2&perPage=25
```

Response: `{ "data": [...], "meta": { "total": 100, "page": 2 } }`

**v2 (cursor):**

```
GET /v2/users?limit=25&after=cursor_abc123
```

Response: `{ "data": [...], "meta": { "hasNextPage": true, "endCursor": "cursor_xyz" } }`

**Migration**: Replace `page`/`perPage` with `limit` (max 100). First request omits `after`; subsequent pages use `endCursor` from previous response.

---

## Non-Breaking Additions

- `GET /v2/users/:id/audit-log`
- `filters.createdAfter` optional query parameter

---

## Support

Questions: support@example.com or open a ticket.

````

---

## 7. Changelog Format

Maintain `CHANGELOG.md` or `CHANGELOG_API.md` using **Keep a Changelog** format with API-specific sections.

```markdown
# API Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Dates UTC. Breaking changes marked with BREAKING.

---

## [v2.3] -- 2024-06-11

### Added
- `GET /v2/users/:id/sessions` -- list active sessions
- `DELETE /v2/users/:id/sessions` -- revoke all sessions
- Optional `includeDeleted` query param on `GET /v2/users`

### Changed
- `PATCH /v2/users/:id` accepts partial updates (previously required all fields)
- Rate limits on `GET /v2/users`: 100/min -> 500/min

### Fixed
- `GET /v2/orders` no longer returns cancelled orders by default

### Security
- Added `Content-Security-Policy` header to all responses

---

## [v2.0] -- 2024-01-01 BREAKING

### Breaking Changes
- `name` on User split into `firstName`/`lastName` (see migration guide)
- Pagination: offset -> cursor-based (see migration guide)
- `GET /v1/users/search` removed (use `GET /v2/users?q=`)
- Error shape: `error.msg` -> `error.message`

### Added
- Migration guide: https://docs.example.com/api/migration/v1-to-v2
- Cursor pagination on all list endpoints
- `Deprecation` and `Sunset` headers on v1 endpoints

### Deprecated
- All v1 endpoints (sunset: 2025-07-01)

---

## [v1.5] -- 2023-09-15

### Added
- `GET /v1/users/:id/preferences`
- Optional `role` filter on `GET /v1/users`
````

---

## 8. Version Support Matrix

Publish at `GET /versions` or developer portal:

| Version | Status     | Released   | Deprecated | Sunset     |
| ------- | ---------- | ---------- | ---------- | ---------- |
| v3      | **Active** | 2025-01-01 | --         | --         |
| v2      | Deprecated | 2024-01-01 | 2025-01-01 | 2025-12-31 |
| v1      | Sunset     | 2022-06-01 | 2024-01-01 | 2025-07-01 |
