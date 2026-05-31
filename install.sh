#!/usr/bin/env bash
# ============================================================
# install.sh — Install orchestrated-squad into a target project
# Usage: ./install.sh /path/to/project
#   -or- ./install.sh /path/to/project --force
# ============================================================
set -euo pipefail

SQUAD_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${1:-}"
FORCE="${2:-}"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m'

if [ -z "$TARGET_DIR" ]; then
  echo "Usage: $0 <target-project-dir> [--force]"
  echo "Example: $0 /Users/me/projects/my-app"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: target directory not found: $TARGET_DIR"
  exit 1
fi

echo -e "${CYAN}=== orchestrated-squad Install ===${NC}"
echo "Installing into: $TARGET_DIR"

# 1. Agents
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

# 2. Skills
SKILLS_SRC="$SQUAD_DIR/.agents/skills"
SKILLS_DST="$TARGET_DIR/.agents/skills"

mkdir -p "$SKILLS_DST"
cp -r "$SKILLS_SRC/"* "$SKILLS_DST/"
SKILL_COUNT=$(find "$SKILLS_DST" -maxdepth 1 -type d | wc -l)
echo -e "${GREEN}  ✓ $((SKILL_COUNT - 1)) skills copied${NC}"

# 3. AGENTS.md (never overwrite)
if [ -f "$TARGET_DIR/AGENTS.md" ]; then
  echo -e "${GRAY}  . AGENTS.md exists (skipped)${NC}"
else
  cp "$SQUAD_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
  echo -e "${GREEN}  ✓ AGENTS.md created${NC}"
fi

# 4. .workflow/ template
WORKFLOW_DST="$TARGET_DIR/.workflow"
mkdir -p "$WORKFLOW_DST/template"
cp "$SQUAD_DIR/.workflow/template/handoff.md" "$WORKFLOW_DST/template/"
echo -e "${GREEN}  ✓ .workflow/ template created${NC}"

# 5. opencode.json (never overwrite)
if [ -f "$TARGET_DIR/opencode.json" ]; then
  echo -e "${GRAY}  . opencode.json exists (skipped)${NC}"
else
  cp "$SQUAD_DIR/opencode.json" "$TARGET_DIR/opencode.json"
  echo -e "${GREEN}  ✓ opencode.json created${NC}"
fi

# 6. epic-guide.md
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
