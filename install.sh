#!/usr/bin/env bash
# install.sh -- Idempotent dotfiles installer
# Works on macOS and Linux.
# Usage: bash install.sh [--dry-run]

set -euo pipefail

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
COUNT_CREATED=0
COUNT_BACKED_UP=0
COUNT_ERRORS=0

# ---------------------------------------------------------------------------
# OS detection & path setup
# ---------------------------------------------------------------------------
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(uname -s)" == "Darwin" ]]; then
  CONFIG_HOME="${HOME}/.config"
else
  CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}"
fi

OPENCODE_CONFIG="${CONFIG_HOME}/opencode"
CLAUDE_DIR="${HOME}/.claude"
GEMINI_DIR="${HOME}/.gemini"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log_header() {
  echo -e "\n${BOLD}${CYAN}==> $1${RESET}"
}

log_info() {
  echo -e "    ${CYAN}$1${RESET}"
}

do_symlink() {
  local target="$1"
  local link="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}[dry-run]${RESET} would symlink ${BOLD}${link}${RESET} -> ${target}"
    COUNT_CREATED=$((COUNT_CREATED + 1))
    return
  fi

  # Ensure parent directory exists
  local parent
  parent="$(dirname "$link")"
  mkdir -p "$parent"

  # Back up if something already exists and is NOT already our symlink
  if [[ -e "$link" || -L "$link" ]]; then
    if [[ -L "$link" && "$(readlink "$link")" == "$target" ]]; then
      echo -e "  ${GREEN}+${RESET} Already linked: ${BOLD}${link}${RESET}"
      COUNT_CREATED=$((COUNT_CREATED + 1))
      return
    fi
    local ts
    ts="$(date +%Y%m%d_%H%M%S)"
    local backup="${link}.bak.${ts}"
    if mv "$link" "$backup" 2>/dev/null; then
      echo -e "  ${YELLOW}!${RESET} Backed up existing: ${BOLD}${link}${RESET} -> ${backup}"
      COUNT_BACKED_UP=$((COUNT_BACKED_UP + 1))
    else
      echo -e "  ${RED}x${RESET} Could not back up: ${BOLD}${link}${RESET}"
      COUNT_ERRORS=$((COUNT_ERRORS + 1))
      return
    fi
  fi

  if ln -sf "$target" "$link" 2>/dev/null; then
    echo -e "  ${GREEN}+${RESET} Created: ${BOLD}${link}${RESET} -> ${target}"
    COUNT_CREATED=$((COUNT_CREATED + 1))
  else
    echo -e "  ${RED}x${RESET} Failed to create symlink: ${BOLD}${link}${RESET}"
    COUNT_ERRORS=$((COUNT_ERRORS + 1))
  fi
}

# ---------------------------------------------------------------------------
# Step 1: OpenCode presence check
# ---------------------------------------------------------------------------
log_header "OpenCode installation check"

if command -v opencode &>/dev/null; then
  log_info "opencode already installed: $(command -v opencode)"
else
  log_info "opencode not found  -- install it manually before using OpenCode configuration."
  log_info "See: https://opencode.ai/install"
  log_info "Continuing with dotfiles symlink setup."
fi

# ---------------------------------------------------------------------------
# Step 1b: Gemini CLI presence check (informational only)
# ---------------------------------------------------------------------------
log_header "Gemini CLI installation check"

if command -v gemini &>/dev/null; then
  log_info "gemini already installed: $(command -v gemini)"
else
  log_info "gemini not found  -- install it to use Gemini CLI configuration."
  log_info "See: https://github.com/google-gemini/gemini-cli#installation"
fi

# ---------------------------------------------------------------------------
# Step 2: Create target directories
# ---------------------------------------------------------------------------
log_header "Creating target directories"

dirs=(
  "${OPENCODE_CONFIG}"
  "${OPENCODE_CONFIG}/agents"
  "${OPENCODE_CONFIG}/commands"
  "${OPENCODE_CONFIG}/plugins"
  "${OPENCODE_CONFIG}/skills"
  "${OPENCODE_CONFIG}/docs"
  "${CLAUDE_DIR}"
  "${CLAUDE_DIR}/agents"
  "${CLAUDE_DIR}/rules"
  "${CLAUDE_DIR}/skills"
  "${GEMINI_DIR}"
  "${GEMINI_DIR}/commands"
  "${DOTFILES_DIR}/claude"
  "${DOTFILES_DIR}/claude/agents"
  "${DOTFILES_DIR}/claude/rules"
  "${DOTFILES_DIR}/claude/skills"
  "${DOTFILES_DIR}/shared"
)

for d in "${dirs[@]}"; do
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}[dry-run]${RESET} would mkdir -p ${d}"
  else
    mkdir -p "$d"
  fi
done

# ---------------------------------------------------------------------------
# Step 2b: Clone/update third-party skills
# ---------------------------------------------------------------------------
log_header "Third-party skills (humanizer)"

HUMANIZER_DIR="${DOTFILES_DIR}/opencode/skills/humanizer-upstream"
if [[ "$DRY_RUN" == "true" ]]; then
  log_info "[dry-run] would clone/update blader/humanizer into ${HUMANIZER_DIR}"
else
  if [[ -d "${HUMANIZER_DIR}/.git" ]]; then
    log_info "Updating humanizer..."
    git -C "${HUMANIZER_DIR}" pull --ff-only --quiet 2>/dev/null || log_info "humanizer: already up to date (or pull skipped)"
  else
    log_info "Cloning blader/humanizer..."
    if git clone --depth=1 --quiet https://github.com/blader/humanizer.git "${HUMANIZER_DIR}" 2>/dev/null; then
      # Pinned 2026-06-13: prevents supply-chain drift from upstream changes
      git -C "${HUMANIZER_DIR}" checkout 9600f2b7241cb4eed6ad803abee5ea01d67fe8e4 --quiet 2>/dev/null || true
      log_info "humanizer cloned"
    else
      log_info "humanizer clone failed -- skipping (network issue?)"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Step 3: OpenCode symlinks
# ---------------------------------------------------------------------------
log_header "OpenCode symlinks (${OPENCODE_CONFIG}/)"

do_symlink "${DOTFILES_DIR}/opencode/agents"    "${OPENCODE_CONFIG}/agents"
do_symlink "${DOTFILES_DIR}/opencode/commands"  "${OPENCODE_CONFIG}/commands"
do_symlink "${DOTFILES_DIR}/opencode/plugins"   "${OPENCODE_CONFIG}/plugins"
do_symlink "${DOTFILES_DIR}/opencode/skills"    "${OPENCODE_CONFIG}/skills"

# Individual config files (only symlink if the source exists)
for f in opencode.jsonc tui.jsonc; do
  src="${DOTFILES_DIR}/opencode/${f}"
  if [[ -f "$src" ]]; then
    do_symlink "$src" "${OPENCODE_CONFIG}/${f}"
  else
    log_info "Skipping ${f} (not present in dotfiles  -- create it to enable)"
  fi
done

# docs/ directory
src="${DOTFILES_DIR}/opencode/docs"
if [[ -d "$src" ]]; then
  do_symlink "$src" "${OPENCODE_CONFIG}/docs"
else
  log_info "Skipping docs/ (not present in dotfiles)"
fi

# Shared AGENTS.md
src="${DOTFILES_DIR}/shared/AGENTS.md"
if [[ -f "$src" ]]; then
  do_symlink "$src" "${OPENCODE_CONFIG}/AGENTS.md"
else
  log_info "Skipping AGENTS.md (${DOTFILES_DIR}/shared/AGENTS.md not found)"
fi

# ---------------------------------------------------------------------------
# Step 4: Claude Code symlinks
# ---------------------------------------------------------------------------
log_header "Claude Code symlinks (${CLAUDE_DIR}/)"

for f in CLAUDE.md settings.json; do
  src="${DOTFILES_DIR}/claude/${f}"
  if [[ -f "$src" ]]; then
    do_symlink "$src" "${CLAUDE_DIR}/${f}"
  else
    log_info "Skipping ${f} (${src} not found)"
  fi
done

log_info "MCP servers: Claude Code reads .mcp.json from project roots only."
log_info "Template available at ${DOTFILES_DIR}/claude/mcp.json  -- copy to your projects."

for d in agents rules skills; do
  src="${DOTFILES_DIR}/claude/${d}"
  if [[ -d "$src" ]]; then
    do_symlink "$src" "${CLAUDE_DIR}/${d}"
  else
    log_info "Skipping claude/${d}/ (directory not found in dotfiles)"
  fi
done

# ---------------------------------------------------------------------------
# Step 4b: Copilot instructions (informational)
# ---------------------------------------------------------------------------
log_header "GitHub Copilot instructions"

COPILOT_SRC="${DOTFILES_DIR}/copilot"
if [[ -d "$COPILOT_SRC" ]]; then
  log_info "Copilot instructions available at ${COPILOT_SRC}/"
  log_info "To use in a project, copy the relevant files:"
  log_info "  cp ${COPILOT_SRC}/copilot-instructions.md <project>/.github/copilot-instructions.md"
  log_info "  cp -r ${COPILOT_SRC}/instructions/ <project>/.github/instructions/"
  log_info "Or create symlinks for global use."
else
  log_info "Copilot instructions directory not found -- skipping"
fi

# ---------------------------------------------------------------------------
# Step 4c: Gemini CLI symlinks
# ---------------------------------------------------------------------------
log_header "Gemini CLI symlinks (${GEMINI_DIR}/)"

for f in GEMINI.md settings.json; do
  src="${DOTFILES_DIR}/gemini/${f}"
  if [[ -f "$src" ]]; then
    do_symlink "$src" "${GEMINI_DIR}/${f}"
  else
    log_info "Skipping ${f} (${src} not found)"
  fi
done

src="${DOTFILES_DIR}/gemini/commands"
if [[ -d "$src" ]]; then
  do_symlink "$src" "${GEMINI_DIR}/commands"
else
  log_info "Skipping gemini/commands/ (directory not found in dotfiles)"
fi

src="${DOTFILES_DIR}/shared/AGENTS.md"
if [[ -f "$src" ]]; then
  do_symlink "$src" "${GEMINI_DIR}/AGENTS.md"
else
  log_info "Skipping AGENTS.md (${DOTFILES_DIR}/shared/AGENTS.md not found)"
fi

# ---------------------------------------------------------------------------
# Step 5: Bun runtime
# ---------------------------------------------------------------------------
log_header "Bun runtime"

if command -v bun &>/dev/null; then
  log_info "bun already installed: $(command -v bun)"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] would install bun via https://bun.sh/install"
  else
    log_info "Installing bun via official installer..."
    if curl --proto '=https' --tlsv1.2 -fsSL https://bun.sh/install | bash >/dev/null 2>&1; then
      export PATH="${HOME}/.bun/bin:${PATH}"
      if command -v bun &>/dev/null; then
        log_info "bun installed: $(command -v bun)"
      else
        echo -e "  ${YELLOW}!${RESET} bun installer exited 0 but bun not found on PATH"
        COUNT_ERRORS=$((COUNT_ERRORS + 1))
      fi
    else
      echo -e "  ${RED}x${RESET} bun installation failed  -- install manually: https://bun.sh"
      COUNT_ERRORS=$((COUNT_ERRORS + 1))
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Step 5b: Root dependencies (linting, type-checking)
# ---------------------------------------------------------------------------
log_header "Root dependencies (linting, type-checking)"

if [[ -f "${DOTFILES_DIR}/package.json" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] would run package manager install in ${DOTFILES_DIR}"
  else
    log_info "Installing root devDependencies in ${DOTFILES_DIR}..."
    cd "$DOTFILES_DIR"
    if command -v bun &>/dev/null; then
      if ! bun install; then
        echo -e "  ${YELLOW}!${RESET} bun install failed in ${DOTFILES_DIR}"
        COUNT_ERRORS=$((COUNT_ERRORS + 1))
      fi
    elif command -v npm &>/dev/null; then
      if ! npm install; then
        echo -e "  ${YELLOW}!${RESET} npm install failed in ${DOTFILES_DIR}"
        COUNT_ERRORS=$((COUNT_ERRORS + 1))
      fi
    else
      echo -e "  ${YELLOW}!${RESET} Neither bun nor npm found  -- install dependencies manually in ${DOTFILES_DIR}"
    fi
    cd - >/dev/null
  fi
else
  log_info "No package.json in dotfiles root  -- skipping dependency install"
fi

# ---------------------------------------------------------------------------
# Step 6: Plugin dependencies
# ---------------------------------------------------------------------------
log_header "Plugin dependencies"

PLUGIN_DIR="${DOTFILES_DIR}/opencode/plugins"
if [[ -f "${PLUGIN_DIR}/package.json" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] would run package manager install in ${PLUGIN_DIR}"
  else
    log_info "Installing plugin dependencies in ${PLUGIN_DIR}..."
    cd "$PLUGIN_DIR"
    if command -v bun &>/dev/null; then
      if ! bun install; then
        echo -e "  ${YELLOW}!${RESET} bun install failed in ${PLUGIN_DIR}"
        COUNT_ERRORS=$((COUNT_ERRORS + 1))
      fi
    elif command -v npm &>/dev/null; then
      if ! npm install; then
        echo -e "  ${YELLOW}!${RESET} npm install failed in ${PLUGIN_DIR}"
        COUNT_ERRORS=$((COUNT_ERRORS + 1))
      fi
    else
      echo -e "  ${YELLOW}!${RESET} Neither bun nor npm found  -- install dependencies manually in ${PLUGIN_DIR}"
    fi
    cd - >/dev/null
  fi
else
  log_info "No package.json in plugins/  -- skipping dependency install"
fi

# ---------------------------------------------------------------------------
# Step 7: Sync generated files from shared sources
# ---------------------------------------------------------------------------
log_header "Syncing generated files"

SYNC_SCRIPT="${DOTFILES_DIR}/scripts/sync-dotfiles.sh"
if [[ -x "$SYNC_SCRIPT" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] would run scripts/sync-dotfiles.sh"
  else
    bash "$SYNC_SCRIPT"
  fi
else
  log_info "scripts/sync-dotfiles.sh not found or not executable  -- skipping"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}-----------------------------------------${RESET}"
echo -e "${BOLD}Install summary${RESET}"
echo -e "  ${GREEN}+ Created / already linked:${RESET}  ${COUNT_CREATED}"
echo -e "  ${YELLOW}! Existing files backed up:${RESET}  ${COUNT_BACKED_UP}"
echo -e "  ${RED}x Errors:${RESET}                   ${COUNT_ERRORS}"
echo -e "${BOLD}-----------------------------------------${RESET}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "\n${CYAN}Dry-run complete  -- no changes made.${RESET}"
fi

if [[ "$COUNT_ERRORS" -gt 0 ]]; then
  echo -e "\n${RED}Some symlinks could not be created. Check output above.${RESET}"
  exit 1
fi

if [[ "$DRY_RUN" == "false" ]]; then
  echo -e "\n${GREEN}${BOLD}Done!${RESET} Restart opencode to pick up the new configuration."
fi
