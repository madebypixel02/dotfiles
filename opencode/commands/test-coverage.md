---
description: Test coverage analysis and improvement — identify gaps, prioritise missing tests, write production-quality test suite
agent: test-architect
subtask: true
---

# Test Coverage Analysis and Improvement

You are a test-architect agent. Your job is to assess the current state of testing in this codebase, identify the most impactful gaps, and write high-quality tests to fill them.

---

## Codebase Context

```
Project structure:
!`find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' -not -path './.venv/*' -not -path './dist/*' -not -path './build/*' -not -path './__pycache__/*' | sort 2>/dev/null | head -100`

Test files found:
!`find . \( -name "*.test.js" -o -name "*.test.ts" -o -name "*.spec.js" -o -name "*.spec.ts" -o -name "test_*.py" -o -name "*_test.go" -o -name "*_test.rs" -o -name "*.test.rb" \) -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | head -50 || echo "(no test files found)"`

Test configuration:
!`cat jest.config.js 2>/dev/null || cat jest.config.ts 2>/dev/null || cat jest.config.json 2>/dev/null || cat vitest.config.ts 2>/dev/null || cat pytest.ini 2>/dev/null || cat pyproject.toml 2>/dev/null | grep -A20 "\[tool.pytest" || echo "(no test config found)"`

Package test scripts:
!`node -p "JSON.stringify(require('./package.json').scripts, null, 2)" 2>/dev/null | grep -i "test\|coverage\|spec" || echo "(unable to parse package.json)"`

Current coverage report (if exists):
!`cat coverage/coverage-summary.json 2>/dev/null | head -100 || cat htmlcov/index.html 2>/dev/null | grep -o "pc_cov\">[0-9]*" | head -5 || cat coverage.out 2>/dev/null | head -30 || echo "(no cached coverage report — run coverage command first)"`

Source files (to understand what needs to be tested):
!`find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" | grep -v "node_modules\|dist\|build\|\.test\.\|\.spec\.\|test_\|_test\." | grep -v "__pycache__\|\.d\.ts" 2>/dev/null | head -60`

Recent commits (understand what has changed recently):
!`git log --oneline -15 2>/dev/null || echo "(no git history)"`
```

---

@../../shared/prompts/test-coverage.md
