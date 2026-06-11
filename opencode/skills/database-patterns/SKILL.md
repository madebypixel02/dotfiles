---
name: database-patterns
description: Enterprise database design, migration strategy, naming conventions, index design, query optimization, transaction handling, connection pooling, N+1 detection, and data retention policies. Use when designing schemas, writing migrations, optimizing queries, troubleshooting slow DB performance, or planning data lifecycle management.
---

# Enterprise Database Patterns

This skill covers the full lifecycle of enterprise database work — from initial schema design through migration, query optimization, and data retention. Apply these patterns consistently across all services.

---

## 1. Migration Strategy

### The Up/Down Contract

Every migration MUST have a reversible `down` function. If a migration cannot be reversed (e.g., destructive data transformation), document WHY explicitly and provide a data recovery procedure.

```typescript
// ✅ Good — reversible migration
export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("orders", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("status", 50).notNullable().defaultTo("pending");
    table.integer("amount_cents").notNullable();
    table.string("currency", 3).notNullable().defaultTo("USD");
    table.timestamps(true, true); // created_at, updated_at
  });

  // Add index in the same migration as the table
  await db.schema.alterTable("orders", (table) => {
    table.index(["user_id", "status"], "idx_orders_user_status");
    table.index(["created_at"], "idx_orders_created_at");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists("orders");
}
```

### Migration Rules

1. **One concern per migration** — never combine schema changes with data backfills.
2. **Non-destructive by default** — add columns as nullable first; populate; then add NOT NULL constraint in a later migration.
3. **Test down migrations in CI** — run up then down and verify schema is unchanged.
4. **Never modify a migration after it has been merged to main** — create a new migration instead.
5. **Zero-downtime migrations** — for large tables, prefer:
   - Add column as nullable
   - Backfill in batches (never a single UPDATE on millions of rows)
   - Add NOT NULL constraint (PostgreSQL 11+ can do this without a full table scan if default is set)
   - Remove old column in a later deploy

### Zero-Downtime Column Removal

```sql
-- Step 1 (Deploy A): Stop writing the column in application code (still read)
-- Step 2 (Deploy B): Stop reading the column in application code
-- Step 3 (Migration): Drop the column
ALTER TABLE users DROP COLUMN legacy_phone_number;
```

### Large Table Backfills

```typescript
// ✅ Good — batch backfill, not a single giant UPDATE
async function backfillOrderAmountCents(db: Knex): Promise<void> {
  const BATCH_SIZE = 1000;
  let lastId = "";

  while (true) {
    const rows = await db("orders")
      .select("id", "amount_dollars")
      .where("amount_cents", null)
      .where("id", ">", lastId)
      .orderBy("id")
      .limit(BATCH_SIZE);

    if (rows.length === 0) break;

    await db("orders")
      .whereIn(
        "id",
        rows.map((r) => r.id),
      )
      .update({ amount_cents: db.raw("ROUND(amount_dollars * 100)") });

    lastId = rows[rows.length - 1].id;
    await sleep(50); // back-pressure: don't starve other queries
  }
}
```

---

## 2. Naming Conventions

### Tables

- **Plural snake_case**: `users`, `order_items`, `payment_methods`
- Junction tables: `{table_a}_{table_b}` alphabetically: `role_users` (not `user_roles`)
- Avoid prefixes like `tbl_` — they add noise without value

### Columns

- **snake_case**, full words (no abbreviations): `created_at`, not `crt_at`
- Primary key: always `id` (UUID or BIGSERIAL)
- Foreign keys: `{referenced_table_singular}_id` → `user_id`, `order_id`
- Timestamps: `created_at`, `updated_at`, `deleted_at` (for soft deletes)
- Booleans: `is_{state}` or `has_{property}` → `is_active`, `has_verified_email`
- Amounts: include unit in name → `amount_cents`, `duration_seconds`, `size_bytes`
- Status: `status` (string enum) preferred over multiple boolean flags

### Indexes

- `idx_{table}_{columns}` → `idx_users_email`, `idx_orders_user_status`
- Unique constraints: `uniq_{table}_{columns}` → `uniq_users_email`
- Foreign key indexes: always create — `idx_{table}_{fk_column}`

```sql
-- ✅ Good naming examples
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  last_four CHAR(4),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_user_default ON payment_methods(user_id, is_default) WHERE is_default = TRUE;
```

---

## 3. Index Strategy

### When to Add an Index

Add an index when:

- The column appears in a `WHERE`, `ORDER BY`, or `JOIN ON` clause in a frequent query
- `EXPLAIN ANALYZE` shows a Seq Scan on a table with >10,000 rows
- A foreign key column (always index FK columns — PostgreSQL does NOT do this automatically)

Don't add an index when:

- The table has <1,000 rows (full scan is faster)
- The column has very low cardinality AND no partial index is applicable (e.g., `is_deleted` on a table where 99% are deleted)
- The write rate is very high and read rate is low (indexes slow writes)

### Index Types

| Type      | Use Case                                           | Syntax                            |
| --------- | -------------------------------------------------- | --------------------------------- |
| B-tree    | Default; equality and range queries                | `CREATE INDEX ... ON t(col)`      |
| Partial   | Index only a subset of rows                        | `WHERE col IS NOT NULL`           |
| Composite | Multi-column WHERE clauses                         | `(col_a, col_b)` — order matters! |
| GIN       | Full-text search, JSONB, arrays                    | `CREATE INDEX ... USING GIN`      |
| BRIN      | Very large, naturally ordered tables (time-series) | `USING BRIN`                      |

### Composite Index Column Order

Place the most selective column first (highest cardinality), unless the query always includes both columns with equality — then the order can match query patterns.

```sql
-- Query: WHERE user_id = $1 AND status = $2
-- user_id is UUID (very selective), status is enum (low cardinality)
-- ✅ Good: user_id first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Query: WHERE status = 'pending' ORDER BY created_at
-- ✅ Good: status + created_at
CREATE INDEX idx_orders_status_created ON orders(status, created_at)
  WHERE status = 'pending'; -- partial index: only pending rows
```

### EXPLAIN ANALYZE Workflow

```sql
-- Always run EXPLAIN ANALYZE on new queries before shipping
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.amount_cents, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 25;

-- Red flags to look for:
-- "Seq Scan" on large tables
-- "Rows Removed by Filter" >> "Rows" (filter is not using index)
-- "Hash Join" on large tables (consider adding index for nested loop join)
-- Estimated rows << Actual rows (stale statistics — run ANALYZE)
```

---

## 4. Query Optimization

### General Rules

1. **SELECT only what you need** — never `SELECT *` in application code.
2. **Filter early** — push WHERE conditions as close to the data as possible.
3. **Avoid functions on indexed columns** in WHERE clauses — they prevent index use.
4. **Paginate with cursors** for large result sets, not OFFSET (OFFSET scans all preceding rows).
5. **Use prepared statements** for repeated queries (avoids query planning overhead).

```sql
-- ❌ Bad: function on indexed column prevents index use
WHERE LOWER(email) = 'jane@example.com'

-- ✅ Good: use a functional index or store lowercase
-- Option A: functional index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Option B: store normalised
-- Enforce lowercase at application layer before insert/update

-- ❌ Bad: OFFSET pagination — scans O(offset) rows
SELECT * FROM orders ORDER BY created_at DESC LIMIT 25 OFFSET 10000;

-- ✅ Good: cursor pagination — O(1) scan
SELECT * FROM orders
WHERE created_at < :last_cursor_created_at
   OR (created_at = :last_cursor_created_at AND id < :last_cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 25;
```

### CTEs vs. Subqueries

- Use CTEs (`WITH` clauses) for readability when the subquery is referenced multiple times.
- Be aware: in PostgreSQL <12, CTEs are optimisation fences (planned independently). Use `MATERIALIZED` / `NOT MATERIALIZED` to control.

```sql
-- ✅ Good: CTE for readability and reuse
WITH recent_orders AS (
  SELECT user_id, COUNT(*) AS order_count, SUM(amount_cents) AS total_cents
  FROM orders
  WHERE created_at > NOW() - INTERVAL '30 days'
    AND status = 'completed'
  GROUP BY user_id
)
SELECT u.email, ro.order_count, ro.total_cents
FROM users u
JOIN recent_orders ro ON ro.user_id = u.id
WHERE ro.order_count >= 5
ORDER BY ro.total_cents DESC;
```

---

## 5. Transaction Handling

### Rules

1. **Keep transactions short** — hold locks for the minimum time possible.
2. **Never call external APIs inside a transaction** — network latency extends the lock window.
3. **Use serializable isolation** only when strictly necessary (highest overhead).
4. **Handle deadlocks with retry** — they are normal in concurrent systems.

```typescript
// ✅ Good transaction pattern
async function transferFunds(
  db: Knex,
  fromAccountId: string,
  toAccountId: string,
  amountCents: number,
): Promise<void> {
  await db.transaction(async (trx) => {
    // Lock rows in a consistent order to prevent deadlocks
    const [from, to] = await trx("accounts")
      .whereIn("id", [fromAccountId, toAccountId].sort()) // sorted = consistent lock order
      .forUpdate()
      .orderBy("id")

    if (!from || !to) throw new Error("Account not found")

    const fromAccount = from.id === fromAccountId ? from : to
    const toAccount = from.id === toAccountId ? from : to

    if (fromAccount.balance_cents < amountCents) {
      throw new InsufficientFundsError(fromAccountId, amountCents, fromAccount.balance_cents)
    }

    await trx("accounts").where("id", fromAccountId).decrement("balance_cents", amountCents)
    await trx("accounts").where("id", toAccountId).increment("balance_cents", amountCents)

    await trx("transfers").insert({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount_cents: amountCents,
      created_at: new Date(),
    })
    // Transaction commits here; if any step throws, it rolls back automatically
  })
}

// ❌ Bad: external API call inside transaction
await db.transaction(async (trx) => {
  await trx("orders").update({ status: "processing" }).where("id", orderId)
  await stripeClient.createPaymentIntent(amount) // ← NEVER do this inside a transaction
  await trx("payments").insert({ ... })
})
```

### Deadlock Retry

```typescript
async function withDeadlockRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isDeadlock =
        (err as { code?: string }).code === "40P01" || // PostgreSQL deadlock
        (err as { message?: string }).message?.includes("deadlock");
      if (isDeadlock && attempt < maxRetries) {
        const delay = attempt * 100 + Math.random() * 100; // exponential + jitter
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
```

---

## 6. Connection Pooling

### Configuration Guidelines

```typescript
// PostgreSQL with pg / Knex
const pool = knex({
  client: "pg",
  connection: process.env["DATABASE_URL"],
  pool: {
    min: 2, // Keep 2 connections warm at all times
    max: 10, // Max 10 per application instance
    // max = (CPU_CORES * 2) + n_spindles — for typical OLTP workloads
    // For a 4-core server: max = 10–12
    idleTimeoutMillis: 30_000, // Release idle connections after 30s
    createTimeoutMillis: 5_000, // Fail if connection can't be created in 5s
    acquireTimeoutMillis: 5_000, // Fail if pool is exhausted after 5s
    reapIntervalMillis: 1_000, // Check for idle connections every 1s
  },
});
```

### Health Checks

```typescript
// Check pool health on app startup and liveness probes
async function checkDatabaseHealth(
  db: Knex,
): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.raw("SELECT 1");
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err) {
    logger.error("Database health check failed", { err });
    return { healthy: false, latencyMs: Date.now() - start };
  }
}
```

### Connection Pool Sizing Rules

- **Rule of thumb**: `max_connections = (num_cpu_cores × 2) + num_disk_spindles`
- Never set `max` to the database's `max_connections` — leave headroom for admin connections.
- With multiple application instances: `pool.max × instance_count < db.max_connections × 0.8`
- Monitor pool wait queue length — if it's consistently >0, increase pool size OR add read replicas.

---

## 7. N+1 Query Detection

### What N+1 Looks Like

```typescript
// ❌ Bad: N+1 — 1 query for orders, then N queries for users
const orders = await db("orders").select("*").limit(50); // 1 query
for (const order of orders) {
  order.user = await db("users").where("id", order.user_id).first(); // 50 queries!
}

// ✅ Good: JOIN or batch load
const orders = await db("orders as o")
  .select("o.*", "u.email as user_email", "u.name as user_name")
  .join("users as u", "u.id", "o.user_id")
  .limit(50); // 1 query

// ✅ Also good: DataLoader pattern (for GraphQL or dynamic include scenarios)
const userIds = orders.map((o) => o.user_id);
const users = await db("users")
  .whereIn("id", userIds)
  .select("id", "email", "name");
const userMap = new Map(users.map((u) => [u.id, u]));
orders.forEach((o) => {
  o.user = userMap.get(o.user_id);
});
```

### Detection in Logs

Configure your query logger to warn on repeated identical queries:

```typescript
db.on("query", (queryData) => {
  // Track query fingerprints — if the same query runs >3x per request, log a warning
  queryTracker.record(queryData.sql);
});
```

Use APM tools (Datadog, Sentry Performance) to visualise repeated DB calls in traces.

---

## 8. Data Retention Policies

### Retention Schedule Template

Define retention for every table in your data dictionary:

| Table               | Retention                        | Deletion Strategy                    | Legal Hold |
| ------------------- | -------------------------------- | ------------------------------------ | ---------- |
| `users`             | Until account deletion + 7 years | Soft delete → hard delete after 7 yr | Yes        |
| `orders`            | 7 years (financial records)      | Archive to cold storage after 2 yr   | Yes        |
| `sessions`          | 30 days (or on logout)           | Hard delete                          | No         |
| `audit_logs`        | 5 years                          | Archive to S3 after 1 year           | Yes        |
| `analytics_events`  | 2 years                          | Hard delete (aggregates kept)        | No         |
| `temp_upload_files` | 24 hours                         | Hard delete                          | No         |

### Soft Delete Pattern

```sql
-- Add deleted_at column
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- All queries exclude deleted records via a view or WHERE clause
CREATE VIEW active_users AS
  SELECT * FROM users WHERE deleted_at IS NULL;

-- Hard delete job (runs via cron after retention period)
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '7 years';
```

### Archival Pattern

```typescript
// Move old records to an archive table before hard deletion
async function archiveOldOrders(db: Knex): Promise<void> {
  const CUTOFF = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

  await db.transaction(async (trx) => {
    // Copy to archive
    await trx.raw(
      `
      INSERT INTO orders_archive
      SELECT * FROM orders
      WHERE created_at < ?
        AND status IN ('completed', 'cancelled', 'refunded')
    `,
      [CUTOFF],
    );

    // Delete originals
    await trx("orders")
      .where("created_at", "<", CUTOFF)
      .whereIn("status", ["completed", "cancelled", "refunded"])
      .delete();
  });
}
```

### GDPR / Right to Erasure

```typescript
// User deletion must cascade through all personal data
async function deleteUserData(db: Knex, userId: string): Promise<void> {
  await db.transaction(async (trx) => {
    // Anonymise instead of delete where records must be kept for legal reasons
    await trx("orders")
      .where("user_id", userId)
      .update({ user_id: null, customer_note: "[DELETED]" });

    // Hard delete truly personal data
    await trx("user_profiles").where("user_id", userId).delete();
    await trx("sessions").where("user_id", userId).delete();
    await trx("payment_methods").where("user_id", userId).delete();

    // Soft-delete the user record (keep for audit trail)
    await trx("users")
      .where("id", userId)
      .update({
        email: `deleted+${userId}@example.com`,
        name: "[Deleted User]",
        deleted_at: new Date(),
      });
  });

  // Audit log: GDPR deletion is itself a business event
  logger.info("User data erased per GDPR request", { userId });
}
```
