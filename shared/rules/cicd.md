# CI/CD Pipeline Rules

These rules govern continuous integration and continuous delivery for all projects in this repository. CI/CD is not optional; every project must have a pipeline from the first commit.

---

## Continuous Integration

### Pre-Commit Hooks

Pre-commit hooks enforce standards locally before code reaches the remote. Run `pre-commit install` once after cloning. The following hooks are mandatory:

| Hook       | Purpose                                    |
| ---------- | ------------------------------------------ |
| Ruff       | Lint and format Python source files        |
| Commitizen | Enforce conventional commit message format |
| Semgrep    | Static security analysis                   |
| Bandit     | Python security linting                    |

All hooks must pass before a commit is accepted. Do not use `--no-verify`. CI runs the same hooks; bypassing locally guarantees a CI failure.

### On Push

Every push to a branch triggers the following CI jobs in order:

1. **Secret Scanning** - Gitleaks scans the push for committed secrets. A detected secret fails the pipeline and blocks the push.
2. **Code Scanning** - GitHub Advanced Security CodeQL analysis for the languages in the repository.
3. **Lint** - Ruff, Pylint, and Bandit run against the changed files. All must pass with no new findings.
4. **Test** - The full test suite runs. Coverage must be at or above 80%. A coverage drop below 80% fails the pipeline.

### Notifications

When any CI job fails on a branch, a notification is sent to the configured Microsoft Teams channel. The notification must include: repository name, branch name, failing job name, and a link to the failed run.

---

## Continuous Delivery

### Semantic Release

Versioning is fully automated using Semantic Release. Version numbers are derived from the conventional commit history on `main`. Do not set or edit version numbers manually.

| Commit type                         | Version bump                 |
| ----------------------------------- | ---------------------------- |
| `fix`                               | Patch (e.g., 1.2.3 to 1.2.4) |
| `feat`                              | Minor (e.g., 1.2.3 to 1.3.0) |
| `feat!` or `BREAKING CHANGE` footer | Major (e.g., 1.2.3 to 2.0.0) |

On each merge to `main`, Semantic Release:

1. Analyses the commits since the last release.
2. Determines the next version number.
3. Updates the version in `pyproject.toml` (or `package.json` for Node projects).
4. Generates a changelog entry.
5. Creates a Git tag with the version number.
6. Creates a GitHub Release with the changelog as the release notes.

### GitHub Release

Every release must have:

- A semantic version tag (e.g., `v1.3.0`).
- A GitHub Release entry with an auto-generated changelog derived from conventional commits.
- The artifacts described in the Artifacts section attached to the release.

---

## Artifacts

### API Services (Docker Images)

API services are packaged as Docker images using a multi-stage build.

```dockerfile
FROM python:3.11-slim-bookworm AS builder
RUN pip install uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM python:3.11-slim-bookworm AS runtime
WORKDIR /app
COPY --from=builder /app/.venv .venv
COPY src/ src/
ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT ["python", "-m", "src.main"]
```

Requirements for Docker images:

- The final stage must not contain build tools, test dependencies, Ruff, Bandit, or source files other than the application package itself.
- Tag every image with the semantic version and the short commit hash: `v1.3.0-a1b2c3d`.
- Never tag an image as `latest`. The `latest` tag is forbidden in production image references.
- Publish images to GitHub Container Registry (GHCR) at `ghcr.io/<org>/<repo>:<tag>`.

### Libraries (Python Packages)

Python libraries are built as wheel and source distribution archives.

```
uv build
```

This produces `.whl` and `.tar.gz` files in the `dist/` directory. Both artifacts are uploaded to GitHub Packages (the registry at `https://pypi.pkg.github.com/<org>`). Attach both to the GitHub Release.

---

## Pre-Deployment Security Scanning

Before any deployment to any environment, the following security checks must pass:

| Check                      | Tool                                        | Failure action                                       |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| SAST                       | CodeQL                                      | Block deployment                                     |
| Dependency vulnerabilities | Dependabot alerts                           | Block if any high or critical CVE is open            |
| Secret scanning            | GitHub Secret Scanning with push protection | Block deployment                                     |
| Dependency review          | GitHub Dependency Review                    | Block if any new vulnerable dependency is introduced |
| Autofix suggestions        | GitHub Copilot Autofix                      | Review and apply or dismiss before merge             |

These checks are enforced by GitHub Advanced Security and must be configured at the repository level. They run on every push and pull request.

---

## Deployment Environments

Three environments are required for all production services. Deployments progress through them in sequence.

### INT (Integration)

- Deployment is automatic after all pre-deployment security scans pass.
- Used for automated integration testing and smoke testing after each merge to `main`.
- No manual approval required.

### CERT (Certification)

- Deployment is automatic after INT deployment succeeds.
- Used for QA testing, performance testing, and user acceptance testing.
- QA team must run their test suite before promotion to PROD is permitted.
- No manual approval required for deployment; manual approval is required for promotion to PROD.

### PROD (Production)

- Deployment requires manual approval through a GitHub Environment Protection Rule.
- At least one designated approver must approve the deployment in the GitHub Actions interface before it proceeds.
- Deployments to PROD without passing INT and CERT are forbidden; the pipeline enforces this ordering.
- PROD deployments use the same image tag that was deployed to CERT; images are not rebuilt for PROD.

---

## Advanced Code Analysis

SonarQube runs on every merge to `main`. It provides:

- Duplicated code detection
- Code smell identification
- Complexity metrics
- Security hotspot review

SonarQube findings do not block the CI pipeline for merges to `main`, but the quality gate result is reported in the PR and must be reviewed before the next release is cut. A failing SonarQube quality gate blocks the Semantic Release step.

---

## Teams Notifications

Configure Microsoft Teams notifications for the following pipeline events:

| Event                                    | Notification                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| CI failure on any branch                 | Alert to the team channel with branch, job, and link                       |
| Deployment failure (any environment)     | Alert to the team channel with environment, service, version, and link     |
| Deployment success to PROD               | Info notification to the team channel confirming the version in production |
| Security scan finding (high or critical) | Immediate alert to the security channel                                    |

Use the Microsoft Teams GitHub Action or an incoming webhook. Include a direct link to the failed run or finding in every notification.
