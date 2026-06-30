---
name: database-patterns
description: Enterprise database design, migration strategy, naming conventions, index design, query optimization, transaction handling, connection pooling, N+1 detection, and data retention policies. Use when designing schemas, writing migrations, optimizing queries, troubleshooting slow DB performance, or planning data lifecycle management.
---

# Enterprise Database Patterns

Full lifecycle: schema design, migration, query optimization, data retention.

---

## 1. Migration Strategy

### Up/Down Contract

Every migration needs reversible `down`. If irreversible: document why + provide recovery procedure.

```typescript
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

1. **One concern per migration**: never combine schema changes with data backfills
2. **Non-destructive default**: add columns nullable first, populate, then add NOT NULL in later migration
3. **Test down migrations in CI**: run up then down, verify schema unchanged
4. **Never modify merged migrations**: create new migration instead
5. **Zero-downtime** for large tables: add nullable column -> batch backfill -> add NOT NULL constraint (PG 11+ skips full scan with default) -> drop old column in later deploy

### Zero-Downtime Column Removal

```sql
-- Step 1 (Deploy A): Stop writing the column (still read)
-- Step 2 (Deploy B): Stop reading the column
-- Step 3 (Migration): Drop the column
ALTER TABLE users DROP COLUMN legacy_phone_number;
```

### Large Table Backfills

```typescript
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

- Plural snake_case: `users`, `order_items`, `payment_methods`
- Junction tables: `{table_a}_{table_b}` alphabetical: `role_users` (not `user_roles`)
- No prefixes like `tbl_`

### Columns

- snake_case, full words (no abbreviations): `created_at`, not `crt_at`
- Primary key: `id` (UUID or BIGSERIAL)
- Foreign keys: `{referenced_table_singular}_id`: `user_id`, `order_id`
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Booleans: `is_{state}` or `has_{property}`: `is_active`, `has_verified_email`
- Amounts with unit: `amount_cents`, `duration_seconds`, `size_bytes`
- Status: string enum preferred over multiple boolean flags

### Indexes

- `idx_{table}_{columns}`: `idx_users_email`, `idx_orders_user_status`
- Unique: `uniq_{table}_{columns}`: `uniq_users_email`
- FK indexes: always create: `idx_{table}_{fk_column}`

```sql
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

### When to Index

Add when: column in `WHERE`/`ORDER BY`/`JOIN ON` of frequent query, `EXPLAIN ANALYZE` shows Seq Scan on >10K rows, FK column (PG does NOT auto-index FKs).

Skip when: table <1K rows, very low cardinality without applicable partial index, high write / low read ratio.

### Index Types

| Type      | Use Case                              | Syntax                       |
| --------- | ------------------------------------- | ---------------------------- |
| B-tree    | Default; equality and range           | `CREATE INDEX ... ON t(col)` |
| Partial   | Subset of rows                        | `WHERE col IS NOT NULL`      |
| Composite | Multi-column WHERE (order matters)    | `(col_a, col_b)`             |
| GIN       | Full-text, JSONB, arrays              | `USING GIN`                  |
| BRIN      | Large naturally-ordered (time-series) | `USING BRIN`                 |

### Composite Column Order

Most selective column first (highest cardinality), unless query always has equality on both columns.

```sql
-- WHERE user_id = $1 AND status = $2
-- user_id (UUID, selective) first
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- WHERE status = 'pending' ORDER BY created_at
CREATE INDEX idx_orders_status_created ON orders(status, created_at)
  WHERE status = 'pending'; -- partial index: only pending rows
```

### EXPLAIN ANALYZE Workflow

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.amount_cents, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 25;

-- Red flags:
-- "Seq Scan" on large tables
-- "Rows Removed by Filter" >> "Rows" (not using index)
-- "Hash Join" on large tables (consider index for nested loop)
-- Estimated rows << Actual rows (stale stats -- run ANALYZE)
```

---

## 4. Query Optimization

### Rules

1. **SELECT only needed columns**: never `SELECT *` in application code
2. **Filter early**: push WHERE close to data
3. **No functions on indexed columns** in WHERE (prevents index use)
4. **Cursor pagination** for large results, not OFFSET (scans all preceding rows)
5. **Prepared statements** for repeated queries (avoids planning overhead)

```sql
-- Bad: function on indexed column
WHERE LOWER(email) = 'jane@example.com'

-- Good: functional index or store lowercase
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Bad: OFFSET pagination O(offset)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 25 OFFSET 10000;

-- Good: cursor pagination O(1)
SELECT * FROM orders
WHERE created_at < :last_cursor_created_at
   OR (created_at = :last_cursor_created_at AND id < :last_cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 25;
```

### CTEs vs Subqueries

CTEs for readability when subquery referenced multiple times. In PG <12, CTEs are optimization fences; use `MATERIALIZED`/`NOT MATERIALIZED` to control.

```sql
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

1. **Keep transactions short**: minimize lock duration
2. **Never call external APIs inside transaction**: network latency extends lock window
3. **Serializable isolation** only when strictly necessary (highest overhead)
4. **Handle deadlocks with retry**: normal in concurrent systems

```typescript
async function transferFunds(
  db: Knex,
  fromAccountId: string,
  toAccountId: string,
  amountCents: number,
): Promise<void> {
  await db.transaction(async (trx) => {
    // Lock rows in consistent order to prevent deadlocks
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
    // Transaction commits here; any throw triggers rollback
  })
}

// Bad: external API inside transaction
await db.transaction(async (trx) => {
  await trx("orders").update({ status: "processing" }).where("id", orderId)
  await stripeClient.createPaymentIntent(amount) // NEVER inside transaction
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

### Configuration

```typescript
const pool = knex({
  client: "pg",
  connection: process.env["DATABASE_URL"],
  pool: {
    min: 2, // Keep 2 connections warm at all times
    max: 10, // Max 10 per application instance
    // max = (CPU_CORES * 2) + n_spindles -- for typical OLTP
    // 4-core server: max = 10-12
    idleTimeoutMillis: 30_000, // Release idle after 30s
    createTimeoutMillis: 5_000, // Fail if can't create in 5s
    acquireTimeoutMillis: 5_000, // Fail if pool exhausted after 5s
    reapIntervalMillis: 1_000, // Check idle every 1s
  },
});
```

### Health Check

```typescript
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

### Pool Sizing Rules

- Formula: `max_connections = (num_cpu_cores * 2) + num_disk_spindles`
- Never set `max` to DB `max_connections`; leave headroom for admin
- Multi-instance: `pool.max * instance_count < db.max_connections * 0.8`
- Monitor pool wait queue; if consistently >0, increase pool or add read replicas

---

## 7. N+1 Query Detection

```typescript
// Bad: N+1 -- 1 query for orders, N for users
const orders = await db("orders").select("*").limit(50); // 1 query
for (const order of orders) {
  order.user = await db("users").where("id", order.user_id).first(); // 50 queries!
}

// Good: JOIN
const orders = await db("orders as o")
  .select("o.*", "u.email as user_email", "u.name as user_name")
  .join("users as u", "u.id", "o.user_id")
  .limit(50); // 1 query

// Good: DataLoader pattern (GraphQL or dynamic includes)
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

Track query fingerprints; warn if same query runs >3x per request. Use APM (Datadog, Sentry Performance) to visualize repeated DB calls in traces.

```typescript
db.on("query", (queryData) => {
  queryTracker.record(queryData.sql);
});
```

---

## 8. Data Retention

### Retention Schedule

| Table               | Retention                | Deletion Strategy                    | Legal Hold |
| ------------------- | ------------------------ | ------------------------------------ | ---------- |
| `users`             | Until deletion + 7 years | Soft delete -> hard delete after 7yr | Yes        |
| `orders`            | 7 years (financial)      | Archive to cold storage after 2yr    | Yes        |
| `sessions`          | 30 days (or on logout)   | Hard delete                          | No         |
| `audit_logs`        | 5 years                  | Archive to S3 after 1yr              | Yes        |
| `analytics_events`  | 2 years                  | Hard delete (aggregates kept)        | No         |
| `temp_upload_files` | 24 hours                 | Hard delete                          | No         |

### Soft Delete

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE VIEW active_users AS
  SELECT * FROM users WHERE deleted_at IS NULL;

-- Hard delete job (cron, after retention period)
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '7 years';
```

### Archival

```typescript
async function archiveOldOrders(db: Knex): Promise<void> {
  const CUTOFF = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

  await db.transaction(async (trx) => {
    await trx.raw(
      `
      INSERT INTO orders_archive
      SELECT * FROM orders
      WHERE created_at < ?
        AND status IN ('completed', 'cancelled', 'refunded')
    `,
      [CUTOFF],
    );

    await trx("orders")
      .where("created_at", "<", CUTOFF)
      .whereIn("status", ["completed", "cancelled", "refunded"])
      .delete();
  });
}
```

### GDPR / Right to Erasure

```typescript
async function deleteUserData(db: Knex, userId: string): Promise<void> {
  await db.transaction(async (trx) => {
    // Anonymize where records must be kept for legal reasons
    await trx("orders")
      .where("user_id", userId)
      .update({ user_id: null, customer_note: "[DELETED]" });

    // Hard delete personal data
    await trx("user_profiles").where("user_id", userId).delete();
    await trx("sessions").where("user_id", userId).delete();
    await trx("payment_methods").where("user_id", userId).delete();

    // Soft-delete user record (keep for audit)
    await trx("users")
      .where("id", userId)
      .update({
        email: `deleted+${userId}@example.com`,
        name: "[Deleted User]",
        deleted_at: new Date(),
      });
  });

  logger.info("User data erased per GDPR request", { userId });
}
```
