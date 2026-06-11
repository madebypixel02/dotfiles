## Summary

Describe what this PR does and why. Include relevant context for reviewers.

## Type of Change

- [ ] `feat` - New feature or capability
- [ ] `fix` - Bug fix (addresses a root cause, not a workaround)
- [ ] `refactor` - Code restructuring with no behavior change
- [ ] `docs` - Documentation only
- [ ] `chore` - Build, tooling, or dependency update
- [ ] `ci` - CI/CD pipeline change
- [ ] `perf` - Performance improvement
- [ ] `test` - Test additions or corrections
- [ ] `revert` - Reverts a previous commit

## Related Issues

Closes #

## Testing

Describe how you tested this change. Include the commands you ran and what you observed.

- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] `bash install.sh --dry-run` passes
- [ ] `pre-commit run --all-files` passes locally

## Standards Checklist

- [ ] All commit messages follow the conventional commits spec (`feat:`, `fix:`, `chore:`, etc.)
- [ ] No inline code comments added; only docstrings or JSDoc for public APIs
- [ ] No emojis in code, commit messages, or documentation
- [ ] No workarounds introduced; root cause has been addressed
- [ ] No AI co-authorship trailers (`Co-authored-by: Claude`, `Co-authored-by: GPT`, etc.) in any commit
- [ ] Clarifying questions were asked before implementation if the spec was ambiguous
- [ ] `pre-commit run --all-files` passes locally with zero new warnings
- [ ] Linter passes with zero new warnings introduced
- [ ] All tests pass and code coverage does not decrease
