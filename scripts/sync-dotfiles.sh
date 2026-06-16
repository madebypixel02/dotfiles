#!/usr/bin/env bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED_RULES_DIR="${DOTFILES_DIR}/shared/rules"
SHARED_PROMPTS_DIR="${DOTFILES_DIR}/shared/prompts"
COPILOT_INSTRUCTIONS_DIR="${DOTFILES_DIR}/copilot/instructions"
GEMINI_COMMANDS_DIR="${DOTFILES_DIR}/gemini/commands"
GEMINI_TEMPLATES_DIR="${DOTFILES_DIR}/gemini/templates"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

COPILOT_MANUAL_FILES=("api.instructions.md" "rubber-duck.instructions.md")

COPILOT_RULE_MAPPINGS=(
    "security.md:security.instructions.md:**/auth/**/*.ts,**/middleware/**/*.ts,**/routes/**/*.ts,**/handlers/**/*.ts"
    "python.md:python.instructions.md:**/*.py"
    "testing.md:testing.instructions.md:**/*.test.ts,**/*.spec.ts,**/tests/**,**/__tests__/**"
    "observability.md:observability.instructions.md:**/logging/**,**/monitoring/**,**/health/**,**/middleware/**,**/telemetry/**,**/observability/**"
    "markdown.md:markdown.instructions.md:**/*.md,**/*.mdx"
    "ai-development.md:ai-development.instructions.md:**/agents/**,**/prompts/**,**/chains/**,**/graphs/**,**/llm/**,**/ai/**,**/rag/**,**/evaluation/**"
)

GEMINI_PROMPT_NAMES=(
    "adr"
    "caveman-commit"
    "caveman"
    "debug"
    "deep-research"
    "feature"
    "hotfix"
    "humanizer"
    "onboard"
    "pr-review"
    "refactor"
    "release"
    "rubber-duck"
    "security-scan"
    "standup"
    "test-coverage"
)

log_header() {
    printf "\n${BOLD}${CYAN}=== %s ===${RESET}\n\n" "$1"
}

log_ok() {
    printf "  ${GREEN}ok${RESET}  %s\n" "$1"
}

log_skip() {
    printf "  ${YELLOW}skip${RESET} %s\n" "$1"
}

log_warn() {
    printf "  ${YELLOW}warn${RESET} %s\n" "$1"
}

log_error() {
    printf "  ${RED}error${RESET} %s\n" "$1"
}

is_manual_copilot_file() {
    local target_filename="$1"
    local manual_file
    for manual_file in "${COPILOT_MANUAL_FILES[@]}"; do
        if [[ "${target_filename}" == "${manual_file}" ]]; then
            return 0
        fi
    done
    return 1
}

build_copilot_generation_header() {
    local source_name="$1"
    printf '<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->\n'
    printf '<!-- Source: shared/rules/%s -->\n' "${source_name}"
    printf '<!-- Regenerate with: scripts/sync-dotfiles.sh -->\n'
}

build_copilot_frontmatter() {
    local apply_to_pattern="$1"
    printf '%s\n' '---'
    printf 'applyTo: "%s"\n' "${apply_to_pattern}"
    printf '%s\n' '---'
}

build_copilot_review_gate() {
    printf '\n%s\n\n' '---'
    printf '%s\n\n' '## Code Review Gate'
    printf '%s\n' 'Before marking any change as complete, verify each item in the checklist below.'
    printf '%s\n\n' 'If this file is in the `applyTo` scope of this instruction file, these checks are mandatory.'
    printf '%s\n' '- [ ] All rules in this file have been applied to the changed code'
    printf '%s\n' '- [ ] No rule has been selectively ignored without a documented reason'
    printf '%s\n' '- [ ] Pre-commit hooks pass locally'
    printf '%s\n' '- [ ] The change has been tested against the scenarios described in the rules above'
}

sync_copilot_instructions() {
    log_header "Syncing copilot/instructions from shared/rules"

    local mapping
    for mapping in "${COPILOT_RULE_MAPPINGS[@]}"; do
        local source_name target_name apply_to_pattern
        source_name="${mapping%%:*}"
        local remainder="${mapping#*:}"
        target_name="${remainder%%:*}"
        apply_to_pattern="${remainder#*:}"

        local source_path="${SHARED_RULES_DIR}/${source_name}"
        local target_path="${COPILOT_INSTRUCTIONS_DIR}/${target_name}"

        if is_manual_copilot_file "${target_name}"; then
            log_skip "${target_name} (manual file — skipped)"
            continue
        fi

        if [[ ! -f "${source_path}" ]]; then
            log_error "Source not found: shared/rules/${source_name}"
            continue
        fi

        local source_content
        source_content="$(cat "${source_path}")"

        {
            build_copilot_generation_header "${source_name}"
            printf '\n'
            build_copilot_frontmatter "${apply_to_pattern}"
            printf '\n'
            printf '%s' "${source_content}"
            build_copilot_review_gate
            printf '\n'
        } > "${target_path}"

        log_ok "copilot/instructions/${target_name}"
    done
}

sync_gemini_commands() {
    log_header "Syncing gemini/commands from templates + shared/prompts"

    mkdir -p "${GEMINI_TEMPLATES_DIR}"

    local prompt_name
    for prompt_name in "${GEMINI_PROMPT_NAMES[@]}"; do
        local template_file="${GEMINI_TEMPLATES_DIR}/${prompt_name}.template.toml"
        local toml_file="${GEMINI_COMMANDS_DIR}/${prompt_name}.toml"
        local shared_prompt_file="${SHARED_PROMPTS_DIR}/${prompt_name}.md"

        if [[ ! -f "${template_file}" ]]; then
            log_warn "Template not found: gemini/templates/${prompt_name}.template.toml — skipping"
            continue
        fi

        if ! grep -q '{{SHARED_PROMPT}}' "${template_file}"; then
            log_skip "gemini/commands/${prompt_name}.toml (template has no {{SHARED_PROMPT}} placeholder)"
            continue
        fi

        if [[ ! -f "${shared_prompt_file}" ]]; then
            log_warn "Shared prompt not found: shared/prompts/${prompt_name}.md — skipping"
            continue
        fi

        local description_line
        description_line="$(grep -m1 '^description = ' "${template_file}" || true)"

        local quote_char=""
        if grep -q '^prompt = """' "${template_file}"; then
            quote_char='"""'
        elif grep -q "^prompt = '''" "${template_file}"; then
            quote_char="'''"
        fi

        local preamble_body
        preamble_body="$(awk '
            /^prompt = """/ || /^prompt = '"'"''"'"''"'"'/{in_prompt=1; next}
            in_prompt && /\{\{SHARED_PROMPT\}\}/{exit}
            in_prompt{print}
        ' "${template_file}")"

        local suffix_body
        suffix_body="$(awk '
            /\{\{SHARED_PROMPT\}\}/{found=1; next}
            found && (/^"""/ || /^'"'"''"'"''"'"'/){exit}
            found{print}
        ' "${template_file}")"

        local shared_content
        shared_content="$(cat "${shared_prompt_file}")"

        {
            printf '# GENERATED FILE -- DO NOT EDIT DIRECTLY\n'
            printf '# Source: gemini/templates/%s.template.toml + shared/prompts/%s.md\n' "${prompt_name}" "${prompt_name}"
            printf '# Regenerate with: scripts/sync-dotfiles.sh\n'
            printf '\n'
            printf '%s\n' "${description_line}"
            printf '\n'
            if [[ "${quote_char}" == '"""' ]]; then
                printf 'prompt = """\n'
            else
                printf "prompt = '''\n"
            fi
            if [[ -n "${preamble_body}" ]]; then
                printf '%s\n' "${preamble_body}"
            fi
            printf '%s\n' "${shared_content}"
            if [[ -n "${suffix_body}" ]]; then
                printf '%s\n' "${suffix_body}"
            fi
            if [[ "${quote_char}" == '"""' ]]; then
                printf '"""\n'
            else
                printf "'''\n"
            fi
        } > "${toml_file}"

        log_ok "gemini/commands/${prompt_name}.toml"
    done
}

validate_mcp_servers() {
    log_header "Validating MCP server consistency"

    local mcp_source="${DOTFILES_DIR}/shared/mcp-servers.json"

    if [[ ! -f "${mcp_source}" ]]; then
        log_warn "shared/mcp-servers.json not found — skipping MCP validation"
        log_warn "Create shared/mcp-servers.json to enable cross-tool MCP drift detection"
        return
    fi

    local server_names
    server_names="$(python3 -c "
import json, sys
with open('${mcp_source}') as f:
    data = json.load(f)
for name in data.get('servers', {}):
    print(name)
" 2>/dev/null || true)"

    if [[ -z "${server_names}" ]]; then
        log_warn "shared/mcp-servers.json contains no servers — nothing to validate"
        return
    fi

    local claude_subset
    claude_subset="$(python3 -c "
import json, sys
with open('${mcp_source}') as f:
    data = json.load(f)
for name in data.get('claude_subset', []):
    print(name)
" 2>/dev/null || true)"

    local opencode_config="${DOTFILES_DIR}/opencode/opencode.jsonc"
    local gemini_config="${DOTFILES_DIR}/gemini/settings.json"
    local claude_config="${DOTFILES_DIR}/claude/mcp.json"
    local all_ok=true

    local server_name
    while IFS= read -r server_name; do
        [[ -z "${server_name}" ]] && continue

        if grep -q "\"${server_name}\"" "${opencode_config}" 2>/dev/null; then
            log_ok "opencode: '${server_name}'"
        else
            log_warn "opencode: '${server_name}' missing from opencode/opencode.jsonc"
            all_ok=false
        fi

        if grep -q "\"${server_name}\"" "${gemini_config}" 2>/dev/null; then
            log_ok "gemini:   '${server_name}'"
        else
            log_warn "gemini:   '${server_name}' missing from gemini/settings.json"
            all_ok=false
        fi

        local in_claude_subset=false
        local subset_name
        while IFS= read -r subset_name; do
            [[ -z "${subset_name}" ]] && continue
            if [[ "${subset_name}" == "${server_name}" ]]; then
                in_claude_subset=true
                break
            fi
        done <<< "${claude_subset}"

        if [[ "${in_claude_subset}" == "true" ]]; then
            if grep -q "\"${server_name}\"" "${claude_config}" 2>/dev/null; then
                log_ok "claude:   '${server_name}'"
            else
                log_warn "claude:   '${server_name}' missing from claude/mcp.json"
                all_ok=false
            fi
        else
            if grep -q "\"${server_name}\"" "${claude_config}" 2>/dev/null; then
                log_warn "claude:   '${server_name}' present but not in claude_subset"
            else
                log_ok "claude:   '${server_name}' (intentionally excluded from Claude subset)"
            fi
        fi
    done <<< "${server_names}"

    if [[ "${all_ok}" == "true" ]]; then
        log_ok "All MCP servers are consistent across opencode, gemini, and claude"
    fi
}

create_shared_mcp_servers() {
    local mcp_source="${DOTFILES_DIR}/shared/mcp-servers.json"

    if [[ -f "${mcp_source}" ]]; then
        return
    fi

    log_header "Creating shared/mcp-servers.json"

    local opencode_config="${DOTFILES_DIR}/opencode/opencode.jsonc"
    if [[ ! -f "${opencode_config}" ]]; then
        log_warn "opencode/opencode.jsonc not found — cannot extract MCP servers"
        return
    fi

    cat > "${mcp_source}" << 'MCPEOF'
{
  "description": "Single source of truth for MCP server names used across all tool configurations.",
  "servers": {}
}
MCPEOF

    log_ok "Created shared/mcp-servers.json (empty — populate with your MCP server names)"
}

main() {
    log_header "Syncing dotfiles from shared sources"

    create_shared_mcp_servers
    sync_copilot_instructions
    sync_gemini_commands
    validate_mcp_servers

    log_header "Sync complete"
}

main "$@"
