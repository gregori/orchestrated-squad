#!/usr/bin/env bash
# ============================================================
# convert-opencode-skill.sh — Convert opencode skill → Devin CLI skill
# Usage: ./convert-opencode-skill.sh <opencode-skill-dir> [--model sonnet]
# Example: ./convert-opencode-skill.sh .agents/skills/python-code-style
# ============================================================
set -euo pipefail

SRC_DIR="${1:-}"
MODEL="${2:-sonnet}"
DEVIN_SKILLS_DIR=".devin/skills"

if [ -z "$SRC_DIR" ]; then
  echo "Usage: $0 <opencode-skill-dir> [--model sonnet]"
  echo "Example: $0 .agents/skills/python-code-style"
  exit 1
fi

if [ ! -f "$SRC_DIR/SKILL.md" ]; then
  echo "Error: SKILL.md not found in $SRC_DIR"
  exit 1
fi

SKILL_NAME=$(basename "$SRC_DIR")
DST_DIR="$DEVIN_SKILLS_DIR/$SKILL_NAME"

mkdir -p "$DST_DIR"

# Parse frontmatter from opencode SKILL.md
DESCRIPTION=$(sed -n '/^description:/p' "$SRC_DIR/SKILL.md" | sed 's/description: *//')

# Determine allowed-tools from permission block
HAS_EDIT=$(grep -q 'edit:.*allow' "$SRC_DIR/SKILL.md" && echo true || echo false)
HAS_BASH=$(grep -q 'bash:.*allow' "$SRC_DIR/SKILL.md" && echo true || echo false)
HAS_READ=$(grep -q 'read:.*allow' "$SRC_DIR/SKILL.md" && echo true || echo false)
HAS_WEBFETCH=$(grep -q 'webfetch:.*allow' "$SRC_DIR/SKILL.md" && echo true || echo false)

TOOLS="- read\n  - grep\n  - glob"
[ "$HAS_EDIT" = true ] && TOOLS="$TOOLS\n  - edit"
[ "$HAS_BASH" = true ] && TOOLS="$TOOLS\n  - exec"
[ "$HAS_WEBFETCH" = true ] && TOOLS="$TOOLS\n  - web"

# Extract body (everything after frontmatter)
BODY=$(sed '1,/^---$/d' "$SRC_DIR/SKILL.md" | sed '1,/^---$/d' 2>/dev/null || tail -n +$(grep -n '^---$' "$SRC_DIR/SKILL.md" | tail -1 | cut -d: -f1 | xargs expr 1 +) "$SRC_DIR/SKILL.md")

# Write Devin SKILL.md
cat > "$DST_DIR/SKILL.md" << 'SKILLEOF'
---
name: SKILLNAME
description: DESCRIPTION
subagent: true
model: MODEL
allowed-tools:
  - read
  - grep
  - glob
TOOLS
triggers:
  - user
  - model
---

BODY
SKILLEOF

# Replace placeholders
sed -i "s/SKILLNAME/$SKILL_NAME/g" "$DST_DIR/SKILL.md"
sed -i "s/DESCRIPTION/$DESCRIPTION/g" "$DST_DIR/SKILL.md"
sed -i "s/MODEL/$MODEL/g" "$DST_DIR/SKILL.md"

# Handle tools multiline
if [ "$HAS_EDIT" = true ] || [ "$HAS_BASH" = true ] || [ "$HAS_WEBFETCH" = true ]; then
  TOOLS_LINE=$(grep -n 'allowed-tools:' "$DST_DIR/SKILL.md" | cut -d: -f1)
  TOOLS_LINE=$((TOOLS_LINE + 4))
  
  [ "$HAS_EDIT" = true ] && sed -i "${TOOLS_LINE}a\  - edit" "$DST_DIR/SKILL.md" && TOOLS_LINE=$((TOOLS_LINE + 1))
  [ "$HAS_BASH" = true ] && sed -i "${TOOLS_LINE}a\  - exec" "$DST_DIR/SKILL.md" && TOOLS_LINE=$((TOOLS_LINE + 1))
  [ "$HAS_WEBFETCH" = true ] && sed -i "${TOOLS_LINE}a\  - web" "$DST_DIR/SKILL.md"
fi

# Copy body content (remove YAML frontmatter, keep body)
awk 'BEGIN { skip=1 } /^---$/ { skip=skip?0:1; next } !skip' "$SRC_DIR/SKILL.md" > /tmp/body.md
# Find the body separator line and replace from there
BODY_START=$(grep -n '^---$' "$DST_DIR/SKILL.md" | tail -1 | cut -d: -f1)
BODY_START=$((BODY_START + 1))
sed -i "${BODY_START},\$d" "$DST_DIR/SKILL.md"
cat /tmp/body.md >> "$DST_DIR/SKILL.md"
rm -f /tmp/body.md

echo "✓ Converted $SKILL_NAME → $DST_DIR/SKILL.md"
exit 0
