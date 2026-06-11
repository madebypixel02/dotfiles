# Enterprise Standards Skill

This skill applies when working in enterprise software environments: large organisations with multiple teams, compliance requirements, formal change management, regulated industries, or codebases maintained across long time horizons.

---

## Context Recognition

Apply enterprise standards when the codebase or organisation exhibits these characteristics:

- Multiple teams contributing to shared services or libraries
- Formal change management or change advisory board (CAB) processes
- Compliance requirements (SOC 2, ISO 27001, PCI DSS, HIPAA, FedRAMP, GDPR, CCPA)
- Regulated deployment windows or approval gates
- Long-lived codebases (5+ years) with significant legacy considerations
- Contracts that specify SLAs, uptime guarantees, or audit requirements

---

## Code Contribution Standards

### Change Scope and Traceability

Every change must be traceable to a requirement, ticket, or approved work item. Code changes without a linked ticket are a red flag in enterprise environments — they make audits difficult and suggest undisclosed intent.

- Link every commit to a ticket: include the ticket number in commit messages
- Keep the scope of a change to what is described in the ticket
- For changes that require formal approval (major features, infrastructure changes, security-sensitive changes): confirm approval is recorded before merging
- Do not make unilateral architectural decisions on enterprise systems — use the ADR process and get sign-off from the appropriate stakeholders

### Code Review Requirements

Enterprise environments typically require more rigorous review:

- All changes require at least one (often two) approvals before merge
- Security-sensitive changes require review from a security reviewer role
- Database schema changes require review from a database administrator or equivalent
- Infrastructure changes require review from the platform or operations team
- Reviewer approval must be re-obtained after significant post-review changes

### Documentation Requirements

Enterprise changes require documentation that survives team turnover:

- Public APIs must have complete, accurate documentation — no "TODO: document this"
- Non-obvious business logic must have inline comments explaining the why, not the what
- New environment variables must be documented in the configuration reference
- Breaking changes must be communicated in advance (deprecation period, migration guide)
- Architecture decisions must be recorded as ADRs

---

## Change Management

### Change Categories

Most enterprise environments classify changes:

**Standard changes** — pre-approved, low-risk, frequently performed. Examples: dependency updates within a major version, adding a non-breaking API field, updating configuration within defined parameters. These may follow a simplified process.

**Normal changes** — require a change request with impact assessment, test plan, and rollback plan. Scheduled in advance. Subject to CAB review. Examples: new feature deployments, database schema changes, infrastructure modifications.

**Emergency changes** — follow an expedited process for production incidents. Require retroactive documentation and post-incident review. Higher scrutiny is applied after the fact, not before.

### Change Request Content

For normal changes, prepare:

1. **Description** — what is changing and why
2. **Impact assessment** — what systems or users are affected, what is the risk level
3. **Test plan** — how the change will be validated before and after deployment
4. **Rollback plan** — exactly how to revert if the change causes problems
5. **Deployment schedule** — when the change will be applied, in which environments and in what order
6. **Approval chain** — who must approve before the change proceeds

### Deployment Windows

Enterprise environments often restrict when deployments can occur:

- Identify the deployment window policy for the target environment before scheduling work
- Plan database migrations and other slow operations to complete within the window
- Never deploy to production outside an approved window without emergency change approval

---

## Compliance Considerations

### Audit Logging

Enterprise systems that undergo compliance audits require comprehensive audit trails:

- Log all data access to sensitive records (who accessed what, when)
- Log all mutations to sensitive records (who changed what, from what value, to what value)
- Log all administrative actions (configuration changes, user management, permission changes)
- Store audit logs in an append-only system outside the application's write access
- Retain audit logs for the period required by applicable regulations (often 1–7 years)
- Ensure audit logs include timestamps in UTC, the actor's identity, the resource, and the action

### Data Residency and Sovereignty

- Confirm where data is stored and processed against regulatory requirements
- Do not introduce new data storage locations without verifying compliance
- Cross-border data transfers may require explicit mechanisms (Standard Contractual Clauses, adequacy decisions)

### Encryption Requirements

- Data at rest: encrypted using AES-256 or equivalent, with key management handled by a dedicated key management service
- Data in transit: TLS 1.2 minimum; TLS 1.3 preferred
- Backup data: encrypted to the same standard as primary data
- Key rotation: follow the organisation's key rotation policy

### Access Control

- Apply the principle of least privilege to all service accounts, API tokens, and human access
- Access to production environments should require approval, be time-limited, and be logged
- Privileged access (database direct access, production shell access) should require multi-factor authentication and be audited
- Conduct periodic access reviews — remove access that is no longer needed

---

## SLA and Reliability Considerations

### SLA Awareness

Before making changes, understand the SLAs that apply to the service:

- What is the uptime requirement? (99.9% = ~8.7h downtime/year; 99.99% = ~52m/year)
- What is the response time SLA at what percentile?
- What is the data durability guarantee?
- What are the RPO and RTO in the event of a disaster?

Design changes to be compatible with these commitments. A deployment strategy that requires 5 minutes of downtime violates a 99.99% uptime SLA.

### Zero-Downtime Deployments

Enterprise services typically require zero-downtime deployment:

- Use rolling deployments, blue/green deployments, or canary releases
- Design database migrations to be backwards-compatible with the previous application version
- Avoid holding database locks during deployments
- Test the upgrade path (old code → new code with new schema) in staging before production

### Error Budget Awareness

If the team uses error budget tracking:

- Know the current error budget balance before deploying high-risk changes
- A depleted error budget is a signal to slow down and focus on reliability, not new features
- Report significant error budget consumption (incidents, degraded periods) through the appropriate channel

---

## Enterprise Checklist

Before submitting any significant change for review:

- [ ] Linked to an approved ticket or work item
- [ ] Scope matches the ticket description
- [ ] Required approvals identified (security, DBA, platform team, as applicable)
- [ ] Documentation updated (API docs, config reference, ADR if architectural)
- [ ] Change request prepared for normal or major changes
- [ ] Deployment window confirmed
- [ ] Rollback plan documented and tested
- [ ] Compliance impact assessed (new data types, new access patterns, new storage locations)
- [ ] Audit logging present for sensitive operations
- [ ] SLA compatibility confirmed (no unplanned downtime, migration time within window)
- [ ] Zero-downtime deployment strategy validated
