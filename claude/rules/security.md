---
paths:
  - "**/auth/**"
  - "**/middleware/**"
  - "**/security/**"
  - "**/*.env*"
  - "**/routes/**"
  - "**/handlers/**"
---

@../../shared/rules/security.md

---

## Code Review Gate -- Security

Before approving any security-sensitive change, verify:

- [ ] All external inputs validated at the boundary
- [ ] No secrets, credentials, or PII in code, logs, or error messages
- [ ] SQL / shell / HTML interpolation is parameterised or escaped
- [ ] Authentication checked before authorisation
- [ ] Error messages do not leak internal details to end users
- [ ] New dependencies reviewed for known vulnerabilities
- [ ] Rate limiting applied to public-facing endpoints
