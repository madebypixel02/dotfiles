#!/usr/bin/env bash

set -euo pipefail

REPO=""
REQUIRED_CHECKS=("Quality Gate" "Conventional Commits" "actionlint")

usage() {
  printf 'Usage: %s --repo OWNER/REPO\n' "$(basename "$0")"
  printf '\n'
  printf 'Configure branch protection rules on the main branch using the GitHub CLI.\n'
  printf '\n'
  printf 'Options:\n'
  printf '  --repo OWNER/REPO   Target repository in owner/repo format (required)\n'
  printf '  --help              Show this help message\n'
  printf '\n'
  printf 'Prerequisites:\n'
  printf '  - gh CLI installed and authenticated (gh auth login)\n'
  printf '  - Admin or owner access on the target repository\n'
  printf '\n'
  printf 'Example:\n'
  printf '  %s --repo pixel/dotfiles\n' "$(basename "$0")"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

check_dependencies() {
  if ! command -v gh &>/dev/null; then
    die "gh CLI is not installed. Install it from https://cli.github.com/ and run 'gh auth login'."
  fi

  if ! gh auth status &>/dev/null; then
    die "gh CLI is not authenticated. Run 'gh auth login' first."
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        [[ -n "${2:-}" ]] || die "--repo requires a value in OWNER/REPO format."
        REPO="$2"
        shift 2
        ;;
      --help | -h)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1. Run with --help for usage."
        ;;
    esac
  done

  [[ -n "${REPO}" ]] || die "--repo is required. Run with --help for usage."

  if ! printf '%s' "${REPO}" | grep -qE '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'; then
    die "--repo value '${REPO}' is not in OWNER/REPO format."
  fi
}

build_checks_json() {
  local checks_json="["
  local first=true
  for check in "${REQUIRED_CHECKS[@]}"; do
    if [[ "${first}" == "true" ]]; then
      first=false
    else
      checks_json+=","
    fi
    checks_json+="{\"context\":$(printf '%s' "${check}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"
  done
  checks_json+="]"
  printf '%s' "${checks_json}"
}

apply_branch_protection() {
  local owner repo
  owner="${REPO%%/*}"
  repo="${REPO##*/}"

  printf 'Configuring branch protection for main on %s/%s...\n' "${owner}" "${repo}"

  local checks_json
  checks_json="$(build_checks_json)"

  local payload
  payload="$(cat <<JSON
{
  "required_status_checks": {
    "strict": true,
    "checks": ${checks_json}
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
)"

  gh api \
    --method PUT \
    "repos/${owner}/${repo}/branches/main/protection" \
    --input - <<< "${payload}"

  printf 'Branch protection applied successfully.\n'
  printf '\n'
  printf 'Required status checks:\n'
  for check in "${REQUIRED_CHECKS[@]}"; do
    printf '  - %s\n' "${check}"
  done
  printf '\n'
  printf 'Settings applied:\n'
  printf '  - Require PR before merging: yes\n'
  printf '  - Required approving reviews: 1\n'
  printf '  - Dismiss stale reviews on push: yes\n'
  printf '  - Require code owner review: yes\n'
  printf '  - Linear history required: yes\n'
  printf '  - Conversation resolution required: yes\n'
  printf '  - Force pushes: blocked\n'
  printf '  - Branch deletions: blocked\n'
  printf '  - Enforce rules for admins: yes\n'
}

main() {
  parse_args "$@"
  check_dependencies
  apply_branch_protection
}

main "$@"
