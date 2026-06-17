# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

**orchestrated-squad** is a multi-agent software engineering system — a collection of agent definitions and skills that you install *into other projects*. This repo itself has no build system, tests, or runtime. The deliverable is the agent/skill files that get copied to target projects via the install scripts.

## Installation

```bash
# Bash (Linux/macOS/Git Bash)
./install.sh /path/to/target-project                       # opencode (default)
./install.sh /path/to/target-project --target vscode       # VS Code Copilot Chat
./install.sh /path/to/target-project --target devin        # Devin CLI
./install.sh /path/to/target-project --target claude       # Claude Code
./install.sh /path/to/target-project --target devin --force  # overwrite existing

# PowerShell (Windows)
.\install.ps1 \path\to\target-project
.\install.ps1 \path\to\target-project -Target vscode
.\install.ps1 \path\to\target-project -Target devin
.\install.ps1 \path\to\target-project -Target claude
.\install.ps1 \path\to\target-project -Target devin -Force
```

## Directory Structure

```
.opencode/agents/     ← Agent definitions for opencode (*.md with YAML frontmatter)
.github/agents/       ← Same agents for VS Code Copilot Chat (*.agent.md format)
.devin/               ← Devin CLI: AGENTS.md (root orchestrator) + skills/ + phases/ + bin/
.claude/agents/       ← Agent definitions for Claude Code (*.md with YAML frontmatter)
.claude/settings.json ← Claude Code pre-approved permissions (gh, git, npx)
.agents/skills/       ← Canonical skills (shared across opencode, devin, claude)
.github/skills/       ← Skills for VS Code
.workflow/template/   ← Handoff template (handoff.md); .workflow/ itself is gitignored
AGENTS.md             ← Workflow overview for all targets (also used as opencode context)
opencode.json         ← opencode MCP config (serena + context7)
```

## Agent Architecture

**13 agents** organized in a strict pipeline. Each is a Markdown file with YAML frontmatter followed by a system prompt. Frontmatter fields differ by target (see table below).

| Layer | Agents | Key constraint |
|-------|--------|----------------|
| Orchestration | planner, bug-triager | planner never writes code/docs/requirements itself |
| Requirements | product-manager, requirements-reviewer | PM↔RR cycle until approved |
| Design | tech-analyst | performs self-review (autocrítica) before output |
| Documentation | doc-writer | PRDs, stories, ADRs, CHANGELOG |
| Issue Mgmt | issue-creator | one GitHub Issue per task via `gh api` |
| Implementation | implementer, sre | run in parallel; smallest change possible |
| Quality | reviewer, linter, tester | reporters only — linter never fixes |
| Release | finisher | conventional commit + PR + CHANGELOG |

## Shared State: `.workflow/`

`.workflow/` is the canonical inter-agent state (gitignored). Every agent reads `handoff.md` on start and writes to it before handing off. Structure:

```markdown
## Current Status
- Phase: (epic-refinement / story-execution / implementation / review / complete)

## Epic Context
- Epic / Stories / Current Story / Current Issue

## Decisions
| ID | Decision | Rationale |

## Next Agent
## Open Questions
```

## Skills System

Skills are Markdown files with YAML frontmatter (`name`, `description`, `argument-hint`) consumed by agents via `npx skills`. Bundled skills:

| Skill | Location | Purpose |
|-------|----------|---------|
| `handoff` | `.agents/skills/handoff/` | Compact conversation for agent transitions |
| `grill-me` | `.agents/skills/grill-me/` | Deep user interview (used by product-manager) |
| `find-skills` | `.agents/skills/find-skills/` | Discover project-specific skills via `npx skills find <domain>` |
| `github-issues` | `.agents/skills/github-issues/` | Create/manage GitHub Issues |
| `caveman-commit` | `.agents/skills/caveman-commit/` | Ultra-compact conventional commit messages |
| `constitution-generator` | `.agents/skills/constitution-generator/` | 6-round interview → `CONSTITUTION.md` |

Project-specific skills (e.g. `python-code-style`, `terraform-engineer`) are NOT bundled — agents discover them at runtime via `find-skills`.

## Multi-Target Format Differences

| Aspect | opencode | vscode | devin | claude |
|--------|----------|--------|-------|--------|
| Agent files | `.opencode/agents/*.md` | `.github/agents/*.agent.md` | `.devin/skills/*/SKILL.md` | `.claude/agents/*.md` |
| Frontmatter key fields | `model`, `temperature`, `max_steps`, `permission` | `name`, `tools`, `agents`, `handoffs` | `name`, `subagent`, `allowed-tools`, `triggers` | `name`, `model`, `tools`, `disallowedTools`, `maxTurns` |
| Model format | `opencode-go/qwen3.6-plus` | `Claude Sonnet 4.6 (copilot)` | `sonnet` | `sonnet` / `haiku` / `opus` |
| Orchestrator | `@planner` in opencode | `@planner` in Copilot Chat | Root `AGENTS.md` (sequential phases) | `@planner` in Claude Code chat |
| Subagent invocation | `task:` permission block | `handoffs:` list | `/skill-name` commands | `Agent` tool in system prompt |
| Config | `opencode.json` | — | `.devin/config.json` | `.claude/settings.json` |
| Workflow state | `.workflow/` | `.workflow/` | `.workflow/` | `.workflow/` |

The devin target converts the agent-per-file model into a **phase-based script** (`.devin/AGENTS.md`) where a single orchestrator runs phases in order. The claude target uses the **`Agent` tool** for programmatic subagent invocation — orchestrators explicitly call subagents in their system prompts.

## Adding or Modifying Agents

1. Edit the agent file in `.opencode/agents/<name>.md` (opencode source of truth)
2. Mirror changes to `.github/agents/<name>.agent.md` (VS Code format)
3. Mirror changes to `.devin/skills/<name>/SKILL.md` (Devin format)
4. Mirror changes to `.claude/agents/<name>.md` (Claude Code format — note different frontmatter)
5. Update `AGENTS.md` (root) and `.devin/AGENTS.md` if the workflow changes
6. Update `README.md` agent table if model/temperature/role changed

Claude Code frontmatter notes:
- `model`: use `sonnet`, `haiku`, or `opus` (not full model IDs)
- `disallowedTools`: block tools agents must never use (e.g., `Edit`/`Write` for planner and bug-triager)
- `maxTurns`: replaces `max_steps`; orchestrators need higher values (15–20), leaf agents lower (8–10)

## Key Conventions

- **Planner is a pure orchestrator** — it must never write code, docs, or requirements itself
- **Single cycle default** — each review step loops back at most once before escalating
- **Issue tracking is mandatory** — every implementation agent updates its GitHub Issue label and comments
- **`find-skills` first** — every agent discovers project skills before starting work
- **`handoff` before every transition** — compact context goes to OS temp dir; `.workflow/handoff.md` is updated separately
- **`context7` for API verification** — implementer uses it rather than guessing library APIs
- **`CONSTITUTION.md`** — if present in the target project, all agents read it first for project-specific rules
