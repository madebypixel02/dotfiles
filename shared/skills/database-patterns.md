# Database Patterns Skill

This skill applies when designing database schemas, writing queries, implementing migrations, or solving data access performance problems.

---

## Schema Design Principles

### Model the Domain, Not the UI

The database schema should reflect the domain model, not the current UI or API shape. A schema designed around the current interface becomes a liability when the interface changes. Design entities around the real-world concepts they represent.

### Normalisation

Start with a fully normalised schema (third normal form) and denormalise deliberately when there is a measured performance need. Premature denormalisation embeds assumptions about access patterns that are hard to change later.

Denormalise only when:

- A query cannot meet its performance requirement with normalised data after indexing
- The denormalised field is read far more than it is written
- You have a strategy to keep the denormalised value consistent with the source

### Identifiers

- Use surrogate keys (auto-incrementing integers or UUIDs) as primary keys rather than natural keys (email addresses, usernames, product codes)
- Natural keys change; surrogate keys do not
- UUIDs are preferable when records must be created across multiple systems without coordination
- For high-write tables in PostgreSQL, prefer `bigserial` or `gen_random_uuid()` (v4) over ordered UUIDs — random UUIDs distribute writes across the index; ordered UUIDs reduce fragmentation at the cost of predictability
- Expose surrogate keys to clients only when necessary; prefer to route on business identifiers in APIs

### Nullability

- A field should be NOT NULL if the data is always known at insert time
- A nullable field signals "this information may not be available" — make this an intentional decision, not a default
- Two NULLs are not equal in SQL; avoid nullable fields in unique constraints (the semantics are surprising)
- Do not use magic values (empty string, -1, "N/A") to represent missing data — use NULL

### Timestamps

- Include `created_at` and `updated_at` on every table, set automatically by the database
- Store all timestamps in UTC
- Use timezone-aware types (`TIMESTAMP WITH TIME ZONE` in PostgreSQL; `DATETIME` with explicit UTC handling in others)
- Include a `deleted_at` timestamp for soft-delete patterns instead of `is_deleted` boolean (allows querying when deletion occurred)

### Constraints

Enforce data integrity at the database level, not only in application code:

- `NOT NULL` for fields that are always required
- `UNIQUE` for fields or field combinations that must be unique
- `CHECK` constraints for values that must satisfy a condition (positive amounts, valid enum values)
- `FOREIGN KEY` constraints for relationships (with explicit `ON DELETE` behaviour: `CASCADE`, `SET NULL`, `RESTRICT`)
- `REFERENCES` with `DEFERRABLE` for circular FK relationships during bulk loads

Do not rely solely on application-level validation. Applications have bugs; constraints do not.

---

## Indexing

### Index What You Query By

Add indexes on:

- Every foreign key column (most databases do not add these automatically)
- Columns used in `WHERE` clauses of frequent queries
- Columns used in `ORDER BY` when combined with selective filters
- Columns used in `JOIN` conditions

### Composite Indexes

The order of columns in a composite index matters. Lead with the most selective column, or with the column that appears in equality conditions (not range conditions). A composite index on `(status, created_at)` supports queries like `WHERE status = 'pending' ORDER BY created_at` but not `WHERE created_at > '2024-01-01' AND status = 'pending'` as efficiently.

The "leftmost prefix rule": a composite index on `(a, b, c)` can be used for queries filtering on `a`, on `(a, b)`, or on `(a, b, c)` — but not on `b` or `c` alone.

### Index Types

- **B-tree** (default in most databases): range queries, equality, ORDER BY, LIKE 'prefix%'
- **GIN/GiST** (PostgreSQL): full-text search, array containment, JSONB queries
- **Partial index**: indexes only rows matching a condition — smaller, faster for selective queries: `CREATE INDEX ON orders (created_at) WHERE status = 'pending'`
- **Covering index**: includes all columns needed by a query, eliminating a table lookup: `CREATE INDEX ON users (email) INCLUDE (name, plan_id)`

### Index Maintenance

- Every index has a write cost — do not add indexes speculatively
- Unused indexes consume space and slow writes; drop them
- Indexes on high-churn columns fragment over time — monitor bloat
- In PostgreSQL, use `CREATE INDEX CONCURRENTLY` to build indexes on live tables without locking

---

## Query Patterns

### Avoid N+1 Queries

An N+1 query is the pattern of issuing 1 query to fetch N records, then N additional queries to fetch associated data for each record. At scale, this is catastrophic.

Detect N+1 queries by:

- Logging query counts per request and alerting when they exceed a threshold
- Enabling slow query logging
- Profiling in staging under realistic load

Fix N+1 queries by:

- Joining the associated data in the initial query
- Batch loading associated records (fetch all associated IDs from the result set, then fetch them in a single `WHERE id IN (...)` query)
- Configuring eager loading in the ORM when the association is always needed

### Pagination

Do not return unbounded result sets. Paginate any query that could return more than a few hundred rows.

**Offset pagination** (`LIMIT 20 OFFSET 100`):

- Simple to implement; easy for clients to jump to any page
- Performance degrades with large offsets (the database scans and discards offset rows)
- Results shift when records are inserted or deleted between page requests

**Keyset / cursor pagination** (`WHERE id > :last_seen_id LIMIT 20`):

- O(1) performance regardless of page depth
- Stable results — insertions and deletions do not shift pages
- Clients cannot jump to an arbitrary page; navigation is forward-only
- Requires an indexed column with a stable sort order

For large datasets or real-time feeds, prefer keyset pagination. For admin interfaces or reports where jump-to-page is required, offset pagination is acceptable with a warning about performance at large offsets.

### Locking and Concurrency

- `SELECT FOR UPDATE` acquires a row-level lock for the duration of the transaction — use when you need to read then update atomically
- `SELECT FOR UPDATE SKIP LOCKED` skips locked rows — the correct pattern for job queues implemented in a relational database
- Optimistic locking with a `version` column is preferable to pessimistic locking when contention is low — compare-and-swap at update time instead of locking at read time
- Keep transactions short — long-running transactions hold locks that block other operations
- Never perform network I/O or user-facing computation inside a database transaction

---

## Migrations

### Migration Principles

- Every schema change is a migration — never modify the database manually in production
- Migrations must be version-controlled alongside the application code
- Migrations must be repeatable (idempotent): running a migration twice must produce the same result as running it once
- Migrations must be ordered and sequential — the system must apply them in the correct order

### Write Reversible Migrations

Write a `down` (rollback) migration for every `up` migration. The rollback must undo the `up` exactly. Test the rollback before deploying.

Exceptions: some operations are genuinely irreversible (deleting data, dropping columns with data that cannot be reconstructed). For these, document explicitly that the migration cannot be rolled back and ensure a backup exists.

### Zero-Downtime Migration Patterns

For tables with ongoing traffic, avoid operations that take full table locks for extended periods.

**Adding a column:**

- Adding a nullable column with no default is instantaneous in most databases
- Adding a NOT NULL column with a constant default is instantaneous in PostgreSQL 11+ (the default is stored in metadata, not written to existing rows)
- Adding a NOT NULL column with a computed default requires a backfill — do this in batches: add as nullable, backfill in batches, then add the NOT NULL constraint

**Removing a column:**

- The application must stop reading the column before the column is dropped
- Sequence: 1) deploy code that ignores the column → 2) drop the column
- Never drop a column and update the code in the same deployment

**Renaming a column:**

1. Add the new column
2. Write to both old and new in the application
3. Backfill the new column from the old
4. Switch reads to the new column
5. Stop writing to the old column
6. Drop the old column

**Adding an index:**

- Use `CREATE INDEX CONCURRENTLY` in PostgreSQL (takes longer but does not block reads or writes)
- In MySQL, most `ALTER TABLE ADD INDEX` operations are online by default in InnoDB with the Online DDL feature

**Backfills on large tables:**

- Process in batches (1000–10000 rows) with a short sleep between batches
- Use `WHERE id > :last_processed_id AND id <= :batch_end` rather than `LIMIT/OFFSET` for large backfills
- Monitor lock contention and replication lag during the backfill

---

## Data Integrity Patterns

### Soft Delete

Soft delete marks records as deleted without removing them:

```sql
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
```

Soft delete is useful when:

- You need an audit trail of deleted records
- Records may be undeleted (restored)
- Foreign key references must remain valid after deletion

Soft delete requires discipline:

- All queries must filter `WHERE deleted_at IS NULL` — easy to forget
- Unique constraints must account for soft-deleted records (a user can re-register with the same email if their old account was soft-deleted)
- Consider a partial unique index: `CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL`

### Idempotency Keys

For operations that must not be duplicated (payments, order creation, message sends), implement idempotency keys:

- The client generates a unique key per operation and sends it with every attempt
- The server stores the key and the result on first execution
- On subsequent requests with the same key, return the stored result without re-executing

Store idempotency keys in the database with a unique constraint and an expiry:

```sql
CREATE TABLE idempotency_keys (
  key         TEXT PRIMARY KEY,
  response    JSONB NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Outbox Pattern

For reliable event publishing alongside a database write:

1. Write the event to an `outbox` table in the same transaction as the domain change
2. A separate process polls the outbox table and publishes events to the message broker
3. Mark outbox rows as processed after successful publish

This pattern ensures the event is published if and only if the transaction commits. It eliminates the dual-write problem (writing to a database and publishing to a broker as two separate, non-atomic operations).

---

## Database Patterns Checklist

When designing or modifying a schema:

- [ ] Entities model the domain, not the current UI
- [ ] Primary keys are surrogate keys
- [ ] All timestamps stored in UTC with timezone-aware types
- [ ] NOT NULL constraints where data is always present
- [ ] UNIQUE constraints for uniqueness requirements
- [ ] CHECK constraints for value ranges and enums
- [ ] FOREIGN KEY constraints with explicit ON DELETE behaviour
- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] No N+1 queries (queries logged and counted during development)
- [ ] Pagination implemented on all list endpoints
- [ ] Transactions kept short (no I/O inside transactions)
- [ ] Migrations are versioned, ordered, and have rollbacks
- [ ] Large table migrations use CONCURRENTLY, batched backfills, or multi-step column operations
- [ ] Soft delete uses partial unique indexes to handle re-registration
- [ ] Idempotency keys implemented for non-idempotent operations
