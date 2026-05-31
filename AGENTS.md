# Agent Guidelines for orchestrated-squad

## Workflow Overview

```
planner (orchestrates)
  ├── product-manager ↔ requirements-reviewer (cycle)
  ├── doc-writer (PRD, stories, ADRs, changelog)
  ├── tech-analyst (architecture + autocrítica)
  ├── issue-creator (GitHub Issues)
  ├── implementer + sre (parallel implementation)
  ├── reviewer (correctness + security checklist)
  ├── linter (report only)
  ├── tester (test + e2e)
  └── finisher (commit + PR + release notes)

bugs: bug-triager → routes to appropriate agent(s)
```

## Handoff System

Every agent **must** use the handoff skill before transitioning to the next agent:

1. Load the `handoff` skill
2. Compact context into a handoff document (saved to OS temp dir)
3. Update `.workflow/handoff.md` with: Current Status, Next Agent, Decisions, Open Questions
4. Invoke the next agent via task invitation

**.workflow/ is the canonical record** — not chat history.

## Agent List

| Agent | Model | Temp | Role |
|-------|-------|------|------|
| planner | qwen3.6-plus | 0.2 | Pure orchestrator (epic + stories) |
| product-manager | qwen3.6-plus | 0.3 | Interview user, refine requirements |
| requirements-reviewer | deepseek-v4-pro | 0.05 | Validate requirements clarity |
| doc-writer | kimi-k2.6 | 0.2 | Write PRD, stories, ADRs, changelog |
| tech-analyst | qwen3.6-plus | 0.15 | Architecture + autocrítica + task breakdown |
| issue-creator | minimax-m2.5 | 0.0 | Create GitHub Issues from tasks |
| implementer | glm-5.1 | 0.1 | Code + unit tests |
| sre | deepseek-v4-pro | 0.1 | Infrastructure + Terraform |
| reviewer | deepseek-v4-pro | 0.05 | Code review + security review (duplo) |
| linter | minimax-m2.5 | 0.0 | Lint check (report only) |
| tester | minimax-m2.7 | 0.0 | Test + e2e implementation |
| bug-triager | deepseek-v4-pro | 0.15 | Triage + route bugs |
| finisher | kimi-k2.6 | 0.2 | Commit + PR + release notes |

## Writing Rules
- Keep entries short and structured
- Prefer bullets over long paragraphs
- Record file paths when discussing code changes
- Record exact test commands and results
- Record unresolved questions under Open Questions in handoff.md

## Skill Discovery
Each agent **must** use `find-skills` at the start of its work to discover relevant skills for the task at hand. For example:

| Agent | May discover |
|-------|-------------|
| tech-analyst | architecture-patterns, python-design-patterns |
| implementer | python-code-style, python-type-safety, vercel-react-best-practices |
| reviewer | python-code-style, sqlalchemy-alembic-expert, vercel-react-best-practices |
| sre | terraform-engineer, oracle-cloud, azure-kubernetes |
| linter | eslint-prettier-config, ruff-recursive-fix, python-code-style |
| tester | python-testing-patterns, behave-skill |
| product-manager | grill-me (mandatory for user interviews) |

Skills are project-specific. The agents discover them automatically via `npx skills find <domain>`. Users can also pre-install skills relevant to their project.

## Skill Usage
- Always use `find-skills` before starting a new task
- Use `grill-me` when product-manager interviews the user for requirements
- Use `handoff` skill before every agent transition
- Use `context7` to verify library/framework/API behavior
- Use `caveman-commit` for commit messages (finisher)
- Use `github-issues` for issue creation (issue-creator)
