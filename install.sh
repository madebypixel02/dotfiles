#!/usr/bin/env bash
# install.sh — Idempotent dotfiles installer
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
    echo -e "  ${CYAN}[dry-run]${RESET} would symlink ${BOLD}${link}${RESET} → ${target}"
    return
  fi

  # Ensure parent directory exists
  local parent
  parent="$(dirname "$link")"
  mkdir -p "$parent"

  # Back up if something already exists and is NOT already our symlink
  if [[ -e "$link" || -L "$link" ]]; then
    if [[ -L "$link" && "$(readlink "$link")" == "$target" ]]; then
      echo -e "  ${GREEN}✓${RESET} Already linked: ${BOLD}${link}${RESET}"
      COUNT_CREATED=$((COUNT_CREATED + 1))
      return
    fi
    local ts
    ts="$(date +%Y%m%d_%H%M%S)"
    local backup="${link}.bak.${ts}"
    if mv "$link" "$backup" 2>/dev/null; then
      echo -e "  ${YELLOW}⚠${RESET} Backed up existing: ${BOLD}${link}${RESET} → ${backup}"
      COUNT_BACKED_UP=$((COUNT_BACKED_UP + 1))
    else
      echo -e "  ${RED}✗${RESET} Could not back up: ${BOLD}${link}${RESET}"
      COUNT_ERRORS=$((COUNT_ERRORS + 1))
      return
    fi
  fi

  if ln -sf "$target" "$link" 2>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} Created: ${BOLD}${link}${RESET} → ${target}"
    COUNT_CREATED=$((COUNT_CREATED + 1))
  else
    echo -e "  ${RED}✗${RESET} Failed to create symlink: ${BOLD}${link}${RESET}"
    COUNT_ERRORS=$((COUNT_ERRORS + 1))
  fi
}

# ---------------------------------------------------------------------------
# Step 1: Install OpenCode if missing
# ---------------------------------------------------------------------------
log_header "OpenCode installation check"

if command -v opencode &>/dev/null; then
  log_info "opencode already installed: $(command -v opencode)"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] would install opencode via the official install script"
  else
    echo -e "  ${YELLOW}opencode not found — installing...${RESET}"
    install_script="$(mktemp)"
    curl -fsSL https://opencode.ai/install -o "${install_script}"
    bash "${install_script}"
    rm -f "${install_script}"
  fi
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
    log_info "Skipping ${f} (not present in dotfiles — create it to enable)"
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

for f in CLAUDE.md settings.json mcp.jsonc; do
  src="${DOTFILES_DIR}/claude/${f}"
  if [[ -f "$src" ]]; then
    do_symlink "$src" "${CLAUDE_DIR}/${f}"
  else
    log_info "Skipping ${f} (${src} not found)"
  fi
done

for d in agents rules skills; do
  src="${DOTFILES_DIR}/claude/${d}"
  if [[ -d "$src" ]]; then
    do_symlink "$src" "${CLAUDE_DIR}/${d}"
  else
    log_info "Skipping claude/${d}/ (directory not found in dotfiles)"
  fi
done

# ---------------------------------------------------------------------------
# Step 5: Plugin dependencies
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
      bun install
    elif command -v npm &>/dev/null; then
      npm install
    else
      echo -e "  ${YELLOW}⚠${RESET} Neither bun nor npm found — install dependencies manually in ${PLUGIN_DIR}"
    fi
    cd - >/dev/null
  fi
else
  log_info "No package.json in plugins/ — skipping dependency install"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}Install summary${RESET}"
echo -e "  ${GREEN}✓ Created / already linked:${RESET}  ${COUNT_CREATED}"
echo -e "  ${YELLOW}⚠ Existing files backed up:${RESET}  ${COUNT_BACKED_UP}"
echo -e "  ${RED}✗ Errors:${RESET}                   ${COUNT_ERRORS}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "\n${CYAN}Dry-run complete — no changes made.${RESET}"
fi

if [[ "$COUNT_ERRORS" -gt 0 ]]; then
  echo -e "\n${RED}Some symlinks could not be created. Check output above.${RESET}"
  exit 1
fi

if [[ "$DRY_RUN" == "false" ]]; then
  echo -e "\n${GREEN}${BOLD}Done!${RESET} Restart opencode to pick up the new configuration."
fi
