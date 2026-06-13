---
description: Full security audit — OWASP Top 10 scan, dependency audit, secrets detection, generates prioritised remediation report
agent: security-auditor
subtask: true
---

# Security Audit

You are a security-auditor agent conducting a comprehensive security review of this codebase. Your mandate is to find every exploitable vulnerability and produce an actionable remediation report.

Be thorough, be sceptical, and assume an adversarial perspective. A missed vulnerability in this report could result in a breach.

---

## Codebase Context

```
Project structure:
!`find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' | sort 2>/dev/null | head -100`

Package manifest (Node.js):
!`cat package.json 2>/dev/null || echo "(no package.json)"`

Package manifest (Python):
!`cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null || cat Pipfile 2>/dev/null || echo "(no Python manifest)"`

Package manifest (Go):
!`cat go.mod 2>/dev/null || echo "(no go.mod)"`

Package manifest (Rust):
!`cat Cargo.toml 2>/dev/null || echo "(no Cargo.toml)"`

Dependency audit results (npm):
!`npm audit --json 2>/dev/null | head -200 || echo "(npm audit not available)"`

Dependency audit results (Python):
!`pip-audit --format json 2>/dev/null | head -200 || safety check 2>/dev/null | head -100 || echo "(pip-audit/safety not available)"`

Environment variable references:
!`grep -r "process\.env\|os\.environ\|getenv\|ENV\[" --include="*.js" --include="*.ts" --include="*.py" --include="*.rb" --include="*.go" -l . 2>/dev/null | head -20 || echo "(unable to scan env references)"`

Potential secret patterns in code:
!`grep -rn "password\s*=\s*['\"][^'\"]\|api_key\s*=\s*['\"][^'\"]\|secret\s*=\s*['\"][^'\"]\|token\s*=\s*['\"][^'\"]" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" --include="*.rb" . 2>/dev/null | grep -v "test\|spec\|mock\|example\|\.env\.example" | head -50 || echo "(no obvious hardcoded secrets found)"`

Git history for sensitive file changes:
!`git log --oneline --all --diff-filter=A -- "*.env" "*.pem" "*.key" "*.p12" "*.pfx" "id_rsa" "id_ed25519" 2>/dev/null | head -20 || echo "(unable to check git history)"`
```

---

@../../shared/prompts/security-scan.md
