---
applyTo: "**/api/**/*.ts,**/routes/**/*.ts,**/controllers/**/*.ts"
---

# API Design Rules

These rules apply to all API route, controller, and handler code. Follow them when creating new endpoints or modifying existing ones.

---

## 1. REST Naming Conventions

### Resources

- Use **plural nouns** for collection endpoints: `/users`, `/orders`, `/products`.
- Use **kebab-case** for multi-word resources: `/payment-methods`, `/audit-logs`.
- Nest resources to express ownership, but limit nesting to 2 levels:
  - `/users/:userId/orders` — acceptable
  - `/users/:userId/orders/:orderId/items` — maximum
  - `/users/:userId/orders/:orderId/items/:itemId/reviews` — too deep; flatten to `/reviews/:reviewId`

### HTTP Methods

| Method   | Usage                                      | Idempotent |
| -------- | ------------------------------------------ | ---------- |
| `GET`    | Fetch resource(s) — never mutates state    | Yes        |
| `POST`   | Create a new resource or trigger an action | No         |
| `PUT`    | Replace a resource entirely                | Yes        |
| `PATCH`  | Partial update — only send changed fields  | No         |
| `DELETE` | Remove a resource                          | Yes        |

- `GET` and `DELETE` must have no request body.
- Use `POST /resources/:id/actions/:action` for non-CRUD operations (e.g., `POST /orders/:id/actions/cancel`).

### Status Codes

| Situation                                   | Code                    |
| ------------------------------------------- | ----------------------- |
| Success, returns body                       | 200                     |
| Created                                     | 201 + `Location` header |
| No content (delete/void update)             | 204                     |
| Bad request / validation error              | 400                     |
| Unauthenticated                             | 401                     |
| Forbidden (authenticated, wrong permission) | 403                     |
| Not found                                   | 404                     |
| Conflict (duplicate, state violation)       | 409                     |
| Unprocessable entity                        | 422                     |
| Rate limited                                | 429 + `Retry-After`     |
| Server error                                | 500                     |

---

## 2. Response Envelope

**All responses** must use this envelope. No naked arrays or naked resource objects at the top level.

### Success (single resource)

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "Jane Smith",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "meta": {}
}
```

### Success (collection)

```json
{
  "data": [
    { "id": "usr_abc123", ... },
    { "id": "usr_def456", ... }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "hasNextPage": true
  }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      { "field": "email", "message": "Invalid email address." },
      { "field": "name", "message": "Name must be at least 1 character." }
    ],
    "requestId": "req_xyz789"
  }
}
```

**Rules:**

- `data` key is always present on success (never null for 200; omit on 204).
- `error` key is always present on failure (never alongside `data`).
- `requestId` is always included in error responses for traceability.
- `meta` is included in all collection responses; optional (can be `{}`) on single-resource responses.
- Never include implementation details (stack traces, SQL, internal paths) in responses.

---

## 3. Input Validation — Required

- Every route with a request body **must** define and apply a Zod schema. No exceptions.
- Every route with query parameters must validate them through a schema.
- Every route with path parameters must validate type/format (e.g., UUID format check).
- Validation errors must return `400` with the structured error envelope, listing all failing fields.

```ts
// Route definition template
import { z } from "zod";

const CreateOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1).max(1000),
        }),
      )
      .min(1),
    shippingAddress: AddressSchema,
  })
  .strict();

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "confirmed", "shipped", "delivered"]).optional(),
});

router.post("/orders", authenticate, async (req, res) => {
  const body = CreateOrderSchema.parse(req.body); // throws on invalid
  const query = QuerySchema.parse(req.query);
  // ...
});
```

---

## 4. Error Format

Error codes use `SCREAMING_SNAKE_CASE`. Maintain a central enum/const of all error codes:

```ts
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  // System
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;
```

Handler error middleware converts typed `AppError` subclasses to the envelope:

```ts
function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Request body is invalid.",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        requestId: req.id,
      },
    });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: err.message,
        requestId: req.id,
      },
    });
  }
  // ... other typed errors ...
  logger.error({ requestId: req.id, err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "An unexpected error occurred.",
      requestId: req.id,
    },
  });
}
```

---

## 5. Versioning

- Version via **URL path prefix**: `/v1/`, `/v2/`. No query-parameter or header versioning.
- All routes under a version prefix share a router: `router.use("/v1", v1Router)`.
- A new version is created when a **breaking change** is introduced:
  - Removing a field from a response.
  - Changing a field type or format.
  - Changing required→optional semantics in a breaking way.
  - Removing an endpoint.
- Adding new optional fields to requests or new fields to responses is **non-breaking** and does not require a new version.
- Maintain the previous version for a **minimum deprecation window of 6 months** after releasing the new version. Announce deprecation via a `Deprecation` and `Sunset` response header.
- Document version differences in `docs/api/CHANGELOG.md`.

```ts
// Versioned router structure
app.use("/v1", require("./routes/v1").router);
app.use("/v2", require("./routes/v2").router);
```

---

## 6. Pagination

- All collection endpoints must support pagination. Never return unbounded lists.
- Default: cursor-based pagination preferred for large/frequently-updated datasets; offset-based acceptable for small/stable datasets.
- Maximum `pageSize`: 100. Default `pageSize`: 20.
- Cursor pagination response:

```json
{
  "data": [...],
  "meta": {
    "total": 1500,
    "pageSize": 20,
    "nextCursor": "eyJpZCI6MTIzfQ==",
    "prevCursor": null
  }
}
```

- Offset pagination response includes `page`, `pageSize`, `total`, `hasNextPage`.

---

## 7. Request/Response Hygiene

- Always set `Content-Type: application/json` on JSON responses.
- Strip sensitive fields (`password`, `passwordHash`, `secret`, `token`) from all API responses using a transform/serializer layer — never rely on callers to omit them.
- Timestamps: ISO 8601 format with UTC timezone (`2024-01-15T10:30:00Z`). No Unix timestamps in responses.
- IDs: prefer prefixed, opaque strings (`usr_abc123`, `ord_xyz789`) over raw database integer IDs.
- Sort order: document and default sort for every collection endpoint. Default to `createdAt` descending unless there is a domain reason otherwise.

---

## 8. Idempotency

- `PUT` and `DELETE` must be idempotent — calling them multiple times with the same inputs produces the same result.
- For non-idempotent `POST` operations that clients may retry (payments, order creation): support an `Idempotency-Key` header. Store the key + response; return the cached response on duplicate keys within a TTL.

---

## 9. Documentation

- Every route must have an OpenAPI annotation (or JSDoc comment used to generate OpenAPI spec).
- Include: summary, description, request schema, all response codes and schemas, authentication requirement.
- Keep the generated spec in `docs/api/openapi.yaml` (or `.json`) committed and up to date.
- Run a spec validation step in CI (e.g., `redocly lint`).
