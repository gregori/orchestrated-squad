# orchestrated-squad for Devin CLI

This directory enables Devin CLI to run the orchestrated-squad workflow autonomously through 13 specialized skills.

## Setup

1. **Install the squad into your project:**
   ```bash
   ./install.sh /path/to/your-project --target devin
   ```
   This copies `.devin/` and swaps `AGENTS.md` at the project root.

2. **Switch back to opencode when needed:**
   ```bash
   ./install.sh /path/to/your-project --target opencode
   ```
   Restores the original `AGENTS.md` from backup.

## How It Works

- `.devin/AGENTS.md` is the orchestrator — copied to project root by the install script
- `.devin/skills/<name>/SKILL.md` are 13 specialized skills (subagents)
- Devin CLI reads root `AGENTS.md` and follows the phases, invoking skills autonomously

## Skills

| Skill | Model | Role |
|-------|-------|------|
| /planner | sonnet | Pure orchestrator |
| /product-manager | sonnet | Interview user, refine requirements |
| /requirements-reviewer | sonnet | Validate requirements |
| /doc-writer | sonnet | PRD, stories, ADRs, changelog |
| /tech-analyst | sonnet | Architecture + task breakdown |
| /issue-creator | haiku | Create GitHub Issues |
| /implementer | sonnet | Code + unit tests |
| /sre | sonnet | Infrastructure (Terraform, K8s) |
| /reviewer | sonnet | Code + security review |
| /linter | haiku | Lint check (report only) |
| /tester | haiku | Run + implement tests |
| /bug-triager | sonnet | Triage and route bugs |
| /finisher | sonnet | Commit + PR + release notes |

## Converting External Skills

To use community skills (e.g., python-code-style, terraform-engineer) with Devin CLI:

```bash
.devin/bin/convert-opencode-skill.sh .agents/skills/python-code-style
# → .devin/skills/python-code-style/SKILL.md
```

## Workflow

See `.devin/AGENTS.md` for the full 7-phase workflow. Devin CLI follows it autonomously.
