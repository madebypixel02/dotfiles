#!/usr/bin/env bash

set -euo pipefail

GITLAB_API_BASE="https://gitlab.com/api/v4"
PROJECT_ID=""

usage() {
  printf 'Usage: %s --project-id PROJECT_ID [--api-base URL]\n' "$(basename "$0")"
  printf '\n'
  printf 'Configure a GitLab project using the GitLab REST API.\n'
  printf '\n'
  printf 'Environment variables:\n'
  printf '  GITLAB_TOKEN       Personal access token with api scope (required)\n'
  printf '  CI_PROJECT_ID      Project ID; used if --project-id is not supplied\n'
  printf '\n'
  printf 'Options:\n'
  printf '  --project-id ID    GitLab numeric project ID (overrides CI_PROJECT_ID)\n'
  printf '  --api-base URL     GitLab API base URL (default: https://gitlab.com/api/v4)\n'
  printf '  --help             Show this help message\n'
  printf '\n'
  printf 'What this script configures:\n'
  printf '  - Default branch set to main\n'
  printf '  - main branch protected: no direct push, MR required, 1 approval required\n'
  printf '  - Pipeline must succeed before merge\n'
  printf '  - All discussions must be resolved before merge\n'
  printf '  - Merge method: merge commit with semi-linear history\n'
  printf '  - Delete source branch on merge: enabled\n'
  printf '  - Squash commits: optional (contributor choice)\n'
  printf '\n'
  printf 'Prerequisites:\n'
  printf '  - curl installed\n'
  printf '  - GITLAB_TOKEN with api scope and maintainer or owner role on the project\n'
  printf '\n'
  printf 'Example:\n'
  printf '  GITLAB_TOKEN=glpat-xxxx %s --project-id 12345678\n' "$(basename "$0")"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

check_dependencies() {
  if ! command -v curl &>/dev/null; then
    die "curl is not installed."
  fi
}

check_env() {
  if [[ -z "${GITLAB_TOKEN:-}" ]]; then
    die "GITLAB_TOKEN environment variable is not set. Export a GitLab personal access token with api scope."
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)
        [[ -n "${2:-}" ]] || die "--project-id requires a value."
        PROJECT_ID="$2"
        shift 2
        ;;
      --api-base)
        [[ -n "${2:-}" ]] || die "--api-base requires a value."
        GITLAB_API_BASE="$2"
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

  if [[ -z "${PROJECT_ID}" ]]; then
    PROJECT_ID="${CI_PROJECT_ID:-}"
  fi

  if [[ -z "${PROJECT_ID}" ]]; then
    die "Project ID not set. Provide --project-id or set CI_PROJECT_ID."
  fi
}

gitlab_put() {
  local path="$1"
  local data="$2"

  curl \
    --silent \
    --fail-with-body \
    --request PUT \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "${data}" \
    "${GITLAB_API_BASE}${path}"
}

gitlab_post() {
  local path="$1"
  local data="$2"

  curl \
    --silent \
    --fail-with-body \
    --request POST \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "${data}" \
    "${GITLAB_API_BASE}${path}"
}

gitlab_delete() {
  local path="$1"

  curl \
    --silent \
    --fail-with-body \
    --request DELETE \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "${GITLAB_API_BASE}${path}"
}

set_default_branch() {
  printf 'Setting default branch to main...\n'

  gitlab_put "/projects/${PROJECT_ID}" \
    '{"default_branch":"main"}' \
    > /dev/null

  printf '  default branch: main\n'
}

configure_project_settings() {
  printf 'Configuring project merge request settings...\n'

  gitlab_put "/projects/${PROJECT_ID}" \
    '{
      "merge_method": "merge",
      "squash_option": "default_off",
      "remove_source_branch_after_merge": true,
      "only_allow_merge_if_pipeline_succeeds": true,
      "only_allow_merge_if_all_discussions_are_resolved": true,
      "resolve_outdated_diff_discussions": false,
      "printing_merge_request_link_enabled": true,
      "merge_requests_ff_only": false
    }' \
    > /dev/null

  printf '  pipeline must succeed before merge: enabled\n'
  printf '  all discussions resolved before merge: enabled\n'
  printf '  delete source branch on merge: enabled\n'
  printf '  squash commits: optional (default off)\n'
  printf '  merge method: merge commit\n'
}

remove_default_main_protection() {
  printf 'Removing any existing protection on main to apply fresh rules...\n'

  gitlab_delete "/projects/${PROJECT_ID}/protected_branches/main" \
    > /dev/null 2>&1 || true
}

protect_main_branch() {
  printf 'Applying branch protection to main...\n'

  gitlab_post "/projects/${PROJECT_ID}/protected_branches" \
    '{
      "name": "main",
      "push_access_level": 0,
      "merge_access_level": 40,
      "unprotect_access_level": 40,
      "allow_force_push": false,
      "code_owner_approval_required": false
    }' \
    > /dev/null

  printf '  direct push: blocked (access level 0 = no one)\n'
  printf '  merge via MR: maintainers and above\n'
  printf '  force push: blocked\n'
}

configure_approvals() {
  printf 'Configuring merge request approval settings...\n'

  gitlab_put "/projects/${PROJECT_ID}/approvals" \
    '{
      "approvals_before_merge": 1,
      "reset_approvals_on_push": true,
      "disable_overriding_approvers_per_merge_request": false,
      "merge_requests_author_approval": false,
      "merge_requests_disable_committers_approval": true
    }' \
    > /dev/null

  printf '  required approvals: 1\n'
  printf '  reset approvals on new push: enabled\n'
  printf '  author self-approval: disabled\n'
  printf '  committer self-approval: disabled\n'
}

print_summary() {
  printf '\n'
  printf 'Project configuration complete for project ID %s.\n' "${PROJECT_ID}"
  printf '\n'
  printf 'Applied settings:\n'
  printf '  - Default branch: main\n'
  printf '  - Direct push to main: blocked\n'
  printf '  - Merge to main: requires merge request\n'
  printf '  - Required approvals: 1\n'
  printf '  - Author self-approval: disabled\n'
  printf '  - Reset approvals on push: enabled\n'
  printf '  - Pipeline must succeed before merge: enabled\n'
  printf '  - All discussions resolved before merge: enabled\n'
  printf '  - Delete source branch on merge: enabled\n'
  printf '  - Squash commits: optional\n'
  printf '  - Force push: blocked\n'
}

main() {
  parse_args "$@"
  check_dependencies
  check_env

  printf 'Configuring GitLab project %s via %s\n\n' "${PROJECT_ID}" "${GITLAB_API_BASE}"

  set_default_branch
  configure_project_settings
  remove_default_main_protection
  protect_main_branch
  configure_approvals
  print_summary
}

main "$@"
