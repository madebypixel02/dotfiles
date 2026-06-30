#!/usr/bin/env bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED_RULES_DIR="${DOTFILES_DIR}/shared/rules"
SHARED_PROMPTS_DIR="${DOTFILES_DIR}/shared/prompts"
COPILOT_INSTRUCTIONS_DIR="${DOTFILES_DIR}/copilot/instructions"
GEMINI_COMMANDS_DIR="${DOTFILES_DIR}/gemini/commands"
GEMINI_TEMPLATES_DIR="${DOTFILES_DIR}/gemini/templates"
COPILOT_AGENTS_DIR="${DOTFILES_DIR}/copilot/agents"
COPILOT_AGENT_TEMPLATES_DIR="${DOTFILES_DIR}/copilot/templates/agents"
COPILOT_PROMPTS_DIR="${DOTFILES_DIR}/copilot/prompts"
COPILOT_PROMPT_TEMPLATES_DIR="${DOTFILES_DIR}/copilot/templates/prompts"

DRIFT_DETECTED=false
TMPDIR_WORK=""

trap '[[ -n "${TMPDIR_WORK}" && -d "${TMPDIR_WORK}" ]] && rm -rf "${TMPDIR_WORK}"' EXIT

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

COPILOT_AGENT_PROMPT_MAPPINGS=(
    "reviewer:pr-review"
    "security-auditor:security-scan"
    "test-architect:test-coverage"
    "rubber-duck:rubber-duck"
    "debugger:debug"
    "docs-writer:adr"
    "release-manager:release"
)

COPILOT_PROMPT_NAMES=(
    "adr"
    "debug"
    "deep-research"
    "feature"
    "hotfix"
    "onboard"
    "pr-review"
    "refactor"
    "release"
    "rubber-duck"
    "security-scan"
    "standup"
    "test-coverage"
)

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
    printf '\n\n%s\n\n' '---'
    printf '%s\n\n' '## Code Review Gate'
    printf '%s\n' 'Before marking any change as complete, verify each item in the checklist below.'
    printf '%s\n\n' "If this file is in the \`applyTo\` scope of this instruction file, these checks are mandatory."
    printf '%s\n' '- [ ] All rules in this file have been applied to the changed code'
    printf '%s\n' '- [ ] No rule has been selectively ignored without a documented reason'
    printf '%s\n' '- [ ] Pre-commit hooks pass locally'
    printf '%s\n' '- [ ] The change has been tested against the scenarios described in the rules above'
}

build_copilot_agent_generation_header() {
    local agent_name="$1"
    local prompt_name="$2"
    printf '<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->\n'
    printf '<!-- Source: copilot/templates/agents/%s.template.md + shared/prompts/%s.md -->\n' "${agent_name}" "${prompt_name}"
    printf '<!-- Regenerate with: scripts/sync-dotfiles.sh -->\n'
}

build_copilot_prompt_generation_header() {
    local prompt_name="$1"
    printf '<!-- GENERATED FILE -- DO NOT EDIT DIRECTLY -->\n'
    printf '<!-- Source: copilot/templates/prompts/%s.template.md + shared/prompts/%s.md -->\n' "${prompt_name}" "${prompt_name}"
    printf '<!-- Regenerate with: scripts/sync-dotfiles.sh -->\n'
}

check_copilot_instructions() {
    local drift_found=false

    local mapping
    for mapping in "${COPILOT_RULE_MAPPINGS[@]}"; do
        local source_name target_name apply_to_pattern
        source_name="${mapping%%:*}"
        local remainder="${mapping#*:}"
        target_name="${remainder%%:*}"
        apply_to_pattern="${remainder#*:}"

        local source_path="${SHARED_RULES_DIR}/${source_name}"
        local target_path="${COPILOT_INSTRUCTIONS_DIR}/${target_name}"
        local temp_path="${TMPDIR_WORK}/${target_name}"

        if [[ ! -f "${source_path}" ]]; then
            printf "  SKIP  copilot/instructions/%s (source shared/rules/%s not found)\n" "${target_name}" "${source_name}"
            continue
        fi

        if [[ ! -f "${target_path}" ]]; then
            printf "  DRIFT copilot/instructions/%s (file does not exist)\n" "${target_name}"
            drift_found=true
            DRIFT_DETECTED=true
            continue
        fi

        local source_content
        source_content="$(cat "${source_path}")"

        {
            build_copilot_frontmatter "${apply_to_pattern}"
            printf '\n'
            build_copilot_generation_header "${source_name}"
            printf '\n'
            printf '%s' "${source_content}"
            build_copilot_review_gate
        } > "${temp_path}"

        if ! diff -q "${temp_path}" "${target_path}" > /dev/null 2>&1; then
            printf "  DRIFT copilot/instructions/%s\n" "${target_name}"
            drift_found=true
            DRIFT_DETECTED=true
        else
            printf "  ok    copilot/instructions/%s\n" "${target_name}"
        fi
    done

    if [[ "${drift_found}" == "false" ]]; then
        return 0
    fi
    return 1
}

check_copilot_agents() {
    local drift_found=false

    local mapping
    for mapping in "${COPILOT_AGENT_PROMPT_MAPPINGS[@]}"; do
        local agent_name prompt_name
        agent_name="${mapping%%:*}"
        prompt_name="${mapping#*:}"

        local template_file="${COPILOT_AGENT_TEMPLATES_DIR}/${agent_name}.template.md"
        local agent_file="${COPILOT_AGENTS_DIR}/${agent_name}.md"
        local shared_prompt_file="${SHARED_PROMPTS_DIR}/${prompt_name}.md"
        local temp_path="${TMPDIR_WORK}/${agent_name}.md"

        if [[ ! -f "${template_file}" ]]; then
            printf "  SKIP  copilot/agents/%s.md (template not found)\n" "${agent_name}"
            continue
        fi

        if ! grep -q '{{SHARED_PROMPT}}' "${template_file}"; then
            printf "  SKIP  copilot/agents/%s.md (no {{SHARED_PROMPT}} placeholder)\n" "${agent_name}"
            continue
        fi

        if [[ ! -f "${shared_prompt_file}" ]]; then
            printf "  SKIP  copilot/agents/%s.md (shared prompt not found)\n" "${agent_name}"
            continue
        fi

        if [[ ! -f "${agent_file}" ]]; then
            printf "  DRIFT copilot/agents/%s.md (file does not exist)\n" "${agent_name}"
            drift_found=true
            DRIFT_DETECTED=true
            continue
        fi

        local preamble_body
        preamble_body="$(awk '/\{\{SHARED_PROMPT\}\}/{exit} {print}' "${template_file}")"

        local suffix_body
        suffix_body="$(awk '/\{\{SHARED_PROMPT\}\}/{found=1; next} found{print}' "${template_file}")"

        local shared_content
        shared_content="$(cat "${shared_prompt_file}")"

        local frontmatter_block
        frontmatter_block="$(awk '/^---$/{n++; print; if(n==2) exit; next} {print}' <<< "${preamble_body}")"

        local preamble_after_fm
        preamble_after_fm="$(awk 'BEGIN{n=0; past=0} /^---$/{n++; if(n==2){past=1; next}} past{print}' <<< "${preamble_body}" | sed '/./,$!d')"

        {
            printf '%s\n' "${frontmatter_block}"
            printf '\n'
            build_copilot_agent_generation_header "${agent_name}" "${prompt_name}"
            if [[ -n "${preamble_after_fm}" ]]; then
                printf '\n%s\n\n' "${preamble_after_fm}"
            else
                printf '\n'
            fi
            printf '%s\n' "${shared_content}"
            if [[ -n "${suffix_body}" ]]; then
                printf '%s\n' "${suffix_body}"
            fi
        } > "${temp_path}"

        if ! diff -q "${temp_path}" "${agent_file}" > /dev/null 2>&1; then
            printf "  DRIFT copilot/agents/%s.md\n" "${agent_name}"
            drift_found=true
            DRIFT_DETECTED=true
        else
            printf "  ok    copilot/agents/%s.md\n" "${agent_name}"
        fi
    done

    if [[ "${drift_found}" == "false" ]]; then
        return 0
    fi
    return 1
}

check_copilot_prompts() {
    local drift_found=false

    local prompt_name
    for prompt_name in "${COPILOT_PROMPT_NAMES[@]}"; do
        local template_file="${COPILOT_PROMPT_TEMPLATES_DIR}/${prompt_name}.template.md"
        local prompt_file="${COPILOT_PROMPTS_DIR}/${prompt_name}.prompt.md"
        local shared_prompt_file="${SHARED_PROMPTS_DIR}/${prompt_name}.md"
        local temp_path="${TMPDIR_WORK}/${prompt_name}.prompt.md"

        if [[ ! -f "${template_file}" ]]; then
            printf "  SKIP  copilot/prompts/%s.prompt.md (template not found)\n" "${prompt_name}"
            continue
        fi

        if ! grep -q '{{SHARED_PROMPT}}' "${template_file}"; then
            printf "  SKIP  copilot/prompts/%s.prompt.md (no {{SHARED_PROMPT}} placeholder)\n" "${prompt_name}"
            continue
        fi

        if [[ ! -f "${shared_prompt_file}" ]]; then
            printf "  SKIP  copilot/prompts/%s.prompt.md (shared prompt not found)\n" "${prompt_name}"
            continue
        fi

        if [[ ! -f "${prompt_file}" ]]; then
            printf "  DRIFT copilot/prompts/%s.prompt.md (file does not exist)\n" "${prompt_name}"
            drift_found=true
            DRIFT_DETECTED=true
            continue
        fi

        local preamble_body
        preamble_body="$(awk '/\{\{SHARED_PROMPT\}\}/{exit} {print}' "${template_file}")"

        local suffix_body
        suffix_body="$(awk '/\{\{SHARED_PROMPT\}\}/{found=1; next} found{print}' "${template_file}")"

        local shared_content
        shared_content="$(cat "${shared_prompt_file}")"

        {
            build_copilot_prompt_generation_header "${prompt_name}"
            printf '\n'
            if [[ -n "${preamble_body}" ]]; then
                printf '%s\n\n' "${preamble_body}"
            fi
            printf '%s\n' "${shared_content}"
            if [[ -n "${suffix_body}" ]]; then
                printf '%s\n' "${suffix_body}"
            fi
        } > "${temp_path}"

        if ! diff -q "${temp_path}" "${prompt_file}" > /dev/null 2>&1; then
            printf "  DRIFT copilot/prompts/%s.prompt.md\n" "${prompt_name}"
            drift_found=true
            DRIFT_DETECTED=true
        else
            printf "  ok    copilot/prompts/%s.prompt.md\n" "${prompt_name}"
        fi
    done

    if [[ "${drift_found}" == "false" ]]; then
        return 0
    fi
    return 1
}

check_copilot_mcp_names() {
    local copilot_mcp="${DOTFILES_DIR}/copilot/mcp-config.json"
    local mcp_source="${DOTFILES_DIR}/shared/mcp-servers.json"

    if [[ ! -f "${copilot_mcp}" ]]; then
        printf "  SKIP  Copilot MCP (copilot/mcp-config.json not found)\n"
        return 0
    fi

    if [[ ! -f "${mcp_source}" ]]; then
        printf "  SKIP  Copilot MCP (shared/mcp-servers.json not found)\n"
        return 0
    fi

    local copilot_servers
    copilot_servers="$(python3 -c "
import json, sys
with open('${copilot_mcp}') as f:
    data = json.load(f)
for name in data.get('mcpServers', {}):
    print(name)
" 2>/dev/null || true)"

    local shared_servers
    shared_servers="$(python3 -c "
import json, sys
with open('${mcp_source}') as f:
    data = json.load(f)
for name in data.get('servers', {}):
    print(name)
" 2>/dev/null || true)"

    if [[ -z "${copilot_servers}" ]]; then
        printf "  SKIP  Copilot MCP (no servers in copilot/mcp-config.json)\n"
        return 0
    fi

    local drift_found=false
    local server_name
    while IFS= read -r server_name; do
        [[ -z "${server_name}" ]] && continue
        if echo "${shared_servers}" | grep -qx "${server_name}"; then
            printf "  ok    copilot MCP: %s\n" "${server_name}"
        else
            printf "  DRIFT copilot MCP: '%s' not found in shared/mcp-servers.json\n" "${server_name}"
            drift_found=true
            DRIFT_DETECTED=true
        fi
    done <<< "${copilot_servers}"

    if [[ "${drift_found}" == "false" ]]; then
        return 0
    fi
    return 1
}

check_gemini_commands() {
    local drift_found=false

    local prompt_name
    for prompt_name in "${GEMINI_PROMPT_NAMES[@]}"; do
        local template_file="${GEMINI_TEMPLATES_DIR}/${prompt_name}.template.toml"
        local toml_file="${GEMINI_COMMANDS_DIR}/${prompt_name}.toml"
        local shared_prompt_file="${SHARED_PROMPTS_DIR}/${prompt_name}.md"
        local temp_path="${TMPDIR_WORK}/${prompt_name}.toml"

        if [[ ! -f "${template_file}" ]]; then
            printf "  SKIP  gemini/commands/%s.toml (template not found)\n" "${prompt_name}"
            continue
        fi

        if ! grep -q '{{SHARED_PROMPT}}' "${template_file}"; then
            printf "  SKIP  gemini/commands/%s.toml (no {{SHARED_PROMPT}} placeholder)\n" "${prompt_name}"
            continue
        fi

        if [[ ! -f "${shared_prompt_file}" ]]; then
            printf "  SKIP  gemini/commands/%s.toml (shared prompt not found)\n" "${prompt_name}"
            continue
        fi

        if [[ ! -f "${toml_file}" ]]; then
            printf "  DRIFT gemini/commands/%s.toml (file does not exist)\n" "${prompt_name}"
            drift_found=true
            DRIFT_DETECTED=true
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
        } > "${temp_path}"

        if ! diff -q "${temp_path}" "${toml_file}" > /dev/null 2>&1; then
            printf "  DRIFT gemini/commands/%s.toml\n" "${prompt_name}"
            drift_found=true
            DRIFT_DETECTED=true
        else
            printf "  ok    gemini/commands/%s.toml\n" "${prompt_name}"
        fi
    done

    if [[ "${drift_found}" == "false" ]]; then
        return 0
    fi
    return 1
}

check_mcp_servers() {
    local mcp_source="${DOTFILES_DIR}/shared/mcp-servers.json"

    if [[ ! -f "${mcp_source}" ]]; then
        printf "  SKIP  MCP validation (shared/mcp-servers.json not found)\n"
        return 0
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
        printf "  SKIP  MCP validation (no servers defined in shared/mcp-servers.json)\n"
        return 0
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

    local server_name
    while IFS= read -r server_name; do
        [[ -z "${server_name}" ]] && continue

        if grep -q "\"${server_name}\"" "${opencode_config}" 2>/dev/null; then
            printf "  ok    opencode: %s\n" "${server_name}"
        else
            printf "  DRIFT opencode: '%s' missing from opencode/opencode.jsonc\n" "${server_name}"
            DRIFT_DETECTED=true
        fi

        if grep -q "\"${server_name}\"" "${gemini_config}" 2>/dev/null; then
            printf "  ok    gemini:   %s\n" "${server_name}"
        else
            printf "  DRIFT gemini:   '%s' missing from gemini/settings.json\n" "${server_name}"
            DRIFT_DETECTED=true
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
                printf "  ok    claude:   %s\n" "${server_name}"
            else
                printf "  DRIFT claude:   '%s' missing from claude/mcp.json\n" "${server_name}"
                DRIFT_DETECTED=true
            fi
        else
            if grep -q "\"${server_name}\"" "${claude_config}" 2>/dev/null; then
                printf "  warn  claude:   '%s' present but not in claude_subset\n" "${server_name}"
            else
                printf "  ok    claude:   %s (intentionally excluded from Claude subset)\n" "${server_name}"
            fi
        fi

        local copilot_config="${DOTFILES_DIR}/copilot/mcp-config.json"
        if grep -q "\"${server_name}\"" "${copilot_config}" 2>/dev/null; then
            printf "  ok    copilot:  %s\n" "${server_name}"
        else
            printf "  ok    copilot:  %s (not included in Copilot config)\n" "${server_name}"
        fi
    done <<< "${server_names}"
}

main() {
    TMPDIR_WORK="$(mktemp -d)"

    printf "Checking for drift between shared sources and generated files...\n\n"

    printf "Copilot instructions:\n"
    check_copilot_instructions || true
    printf "\n"

    printf "Copilot agents:\n"
    check_copilot_agents || true
    printf "\n"

    printf "Copilot prompts:\n"
    check_copilot_prompts || true
    printf "\n"

    printf "Copilot MCP server names:\n"
    check_copilot_mcp_names || true
    printf "\n"

    printf "Gemini commands:\n"
    check_gemini_commands || true
    printf "\n"

    printf "MCP server consistency:\n"
    check_mcp_servers
    printf "\n"

    if [[ "${DRIFT_DETECTED}" == "true" ]]; then
        printf "Drift detected. Run 'scripts/sync-dotfiles.sh' to regenerate out-of-sync files.\n"
        exit 1
    fi

    printf "All generated files are in sync.\n"
    exit 0
}

main "$@"
