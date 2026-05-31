#!/usr/bin/env bash
# ============================================================
# install.sh — Install orchestrated-squad into a target project
# Usage: ./install.sh /path/to/project [--target opencode|vscode|devin] [--force]
# ============================================================
set -euo pipefail

SQUAD_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  echo "Usage: $0 <target-project-dir> [--target opencode|vscode|devin] [--force]"
  echo ""
  echo "Examples:"
  echo "  $0 /path/to/project                          # Default: opencode"
  echo "  $0 /path/to/project --target vscode           # VS Code agents"
  echo "  $0 /path/to/project --target devin            # Devin CLI workflow"
  echo "  $0 /path/to/project --target devin --force    # Overwrite existing"
  exit 1
}

TARGET_DIR=""
TARGET="opencode"
FORCE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE="--force"; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    --target=*) TARGET="${1#*=}"; shift ;;
    -* | --*) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
    *) TARGET_DIR="$1"; shift ;;
  esac
done

if [ -z "$TARGET_DIR" ]; then
  usage
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}Error: target directory not found: $TARGET_DIR${NC}"
  exit 1
fi

case "$TARGET" in
  opencode|vscode|devin) ;;
  *) echo -e "${RED}Error: invalid target '$TARGET'. Use opencode, vscode, or devin.${NC}"; exit 1 ;;
esac

echo -e "${CYAN}=== orchestrated-squad Install (--target $TARGET) ===${NC}"
echo "Installing into: $TARGET_DIR"

if [ "$TARGET" = "opencode" ]; then
  # --- TARGET: opencode ---
  AGENTS_SRC="$SQUAD_DIR/.opencode/agents"
  AGENTS_DST="$TARGET_DIR/.opencode/agents"

  if [ -d "$AGENTS_DST" ] && [ "$FORCE" != "--force" ]; then
    echo -e "${YELLOW}  .opencode/agents/ exists (use --force to overwrite)${NC}"
  else
    mkdir -p "$AGENTS_DST"
    cp -r "$AGENTS_SRC/"* "$AGENTS_DST/"
    COUNT=$(find "$AGENTS_DST" -name "*.md" | wc -l)
    echo -e "${GREEN}  ✓ $COUNT agents copied${NC}"
  fi

  mkdir -p "$TARGET_DIR/.agents/skills"
  cp -r "$SQUAD_DIR/.agents/skills/"* "$TARGET_DIR/.agents/skills/"
  SKILL_COUNT=$(find "$TARGET_DIR/.agents/skills" -maxdepth 1 -type d | wc -l)
  echo -e "${GREEN}  ✓ $((SKILL_COUNT - 1)) skills copied${NC}"

  if [ -f "$TARGET_DIR/AGENTS.md" ]; then
    echo -e "${GRAY}  . AGENTS.md exists (skipped)${NC}"
  else
    cp "$SQUAD_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
    echo -e "${GREEN}  ✓ AGENTS.md created${NC}"
  fi

  mkdir -p "$TARGET_DIR/.workflow/template"
  if [ -f "$SQUAD_DIR/.workflow/template/handoff.md" ]; then
    cp "$SQUAD_DIR/.workflow/template/handoff.md" "$TARGET_DIR/.workflow/template/"
    echo -e "${GREEN}  ✓ .workflow/ template created${NC}"
  fi

  if [ -f "$TARGET_DIR/opencode.json" ]; then
    echo -e "${GRAY}  . opencode.json exists (skipped)${NC}"
  else
    cp "$SQUAD_DIR/opencode.json" "$TARGET_DIR/opencode.json"
    echo -e "${GREEN}  ✓ opencode.json created${NC}"
  fi

  EPIC_GUIDE="$TARGET_DIR/.opencode/epic-guide.md"
  if [ -f "$EPIC_GUIDE" ]; then
    echo -e "${GRAY}  . epic-guide.md exists (skipped)${NC}"
  else
    mkdir -p "$TARGET_DIR/.opencode"
    cp "$SQUAD_DIR/.opencode/epic-guide.md" "$EPIC_GUIDE"
    echo -e "${GREEN}  ✓ epic-guide.md created${NC}"
  fi

  echo ""
  echo -e "${GREEN}=== Installation complete! ===${NC}"
  echo -e "${CYAN}Next: Run 'opencode' in $TARGET_DIR and call @planner to start.${NC}"

elif [ "$TARGET" = "vscode" ]; then
  # --- TARGET: vscode ---
  AGENTS_DST="$TARGET_DIR/.github/agents"

  if [ -d "$AGENTS_DST" ] && [ "$FORCE" != "--force" ]; then
    echo -e "${YELLOW}  .github/agents/ exists (use --force to overwrite)${NC}"
  else
    mkdir -p "$AGENTS_DST"
    cp -r "$SQUAD_DIR/.github/agents/"* "$AGENTS_DST/"
    COUNT=$(find "$AGENTS_DST" -name "*.agent.md" | wc -l)
    echo -e "${GREEN}  ✓ $COUNT VS Code agents copied${NC}"
  fi

  mkdir -p "$TARGET_DIR/.github/skills"
  cp -r "$SQUAD_DIR/.github/skills/"* "$TARGET_DIR/.github/skills/"
  SKILL_COUNT=$(find "$TARGET_DIR/.github/skills" -maxdepth 1 -type d | wc -l)
  echo -e "${GREEN}  ✓ $((SKILL_COUNT - 1)) skills copied${NC}"

  echo ""
  echo -e "${GREEN}=== Installation complete! ===${NC}"
  echo -e "${CYAN}Next: Open $TARGET_DIR in VS Code and use @planner (Copilot Chat).${NC}"

elif [ "$TARGET" = "devin" ]; then
  # --- TARGET: devin ---
  # Backup root AGENTS.md if exists
  if [ -f "$TARGET_DIR/AGENTS.md" ]; then
    BACKUP="$TARGET_DIR/AGENTS.md.bak.opencode"
    if [ "$FORCE" == "--force" ] || [ ! -f "$BACKUP" ]; then
      cp "$TARGET_DIR/AGENTS.md" "$BACKUP"
      echo -e "${GREEN}  ✓ Backed up AGENTS.md -> AGENTS.md.bak.opencode${NC}"
    else
      echo -e "${GRAY}  . AGENTS.md.bak.opencode exists (use --force to re-backup)${NC}"
    fi
  fi

  cp "$SQUAD_DIR/.devin/AGENTS.md" "$TARGET_DIR/AGENTS.md"
  echo -e "${GREEN}  ✓ .devin/AGENTS.md → root AGENTS.md${NC}"

  mkdir -p "$TARGET_DIR/.devin/skills"
  cp -r "$SQUAD_DIR/.devin/skills/"* "$TARGET_DIR/.devin/skills/"
  SKILL_COUNT=$(find "$TARGET_DIR/.devin/skills" -maxdepth 1 -type d | wc -l)
  echo -e "${GREEN}  ✓ $((SKILL_COUNT - 1)) Devin skills copied${NC}"

  mkdir -p "$TARGET_DIR/.devin/bin"
  cp -r "$SQUAD_DIR/.devin/bin/"* "$TARGET_DIR/.devin/bin/"
  echo -e "${GREEN}  ✓ .devin/bin/ scripts copied${NC}"

  cp "$SQUAD_DIR/.devin/config.json" "$TARGET_DIR/.devin/config.json"
  echo -e "${GREEN}  ✓ .devin/config.json created${NC}"

  mkdir -p "$TARGET_DIR/.devin/phases"
  cp -r "$SQUAD_DIR/.devin/phases/"* "$TARGET_DIR/.devin/phases/"
  echo -e "${GREEN}  ✓ .devin/phases/ created${NC}"

  cp "$SQUAD_DIR/.devin/README.md" "$TARGET_DIR/.devin/README.md"
  echo -e "${GREEN}  ✓ .devin/README.md created${NC}"

  # Also install canonical skills for Devin CLI
  mkdir -p "$TARGET_DIR/.agents/skills"
  cp -r "$SQUAD_DIR/.agents/skills/"* "$TARGET_DIR/.agents/skills/"
  echo -e "${GREEN}  ✓ canonical skills copied${NC}"

  echo ""
  echo -e "${GREEN}=== Installation complete! ===${NC}"
  echo -e "${CYAN}Next: Run 'devin' in $TARGET_DIR. The orchestrator (AGENTS.md) will${NC}"
  echo -e "${CYAN}auto-invoke phase scripts. To restore opencode: install.sh $TARGET_DIR --target opencode${NC}"
  echo -e "${CYAN}                              (restores AGENTS.md from AGENTS.md.bak.opencode)${NC}"
fi
