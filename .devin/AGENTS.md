# Orchestrated Squad — Devin CLI Workflow

This file orchestrates the full software engineering workflow. Each phase invokes specialized skills in `.devin/skills/`. Follow phases in order.

## CONSTITUTION.md
If `CONSTITUTION.md` exists at project root, read it first — it contains universal project rules.

## How to Use Skills
When a phase says "Invoke /skill-name", use the Devin CLI skill system to call that skill as a subagent. Skills are defined in `.devin/skills/<name>/SKILL.md` with `subagent: true` and `triggers: [model]`.

## Phase 1: Triage (for bugs only)
**When:** User reports a bug.
**Skip this phase for feature/epic work.**

1. Invoke `/bug-triager` to analyze the bug report
2. Bug-triager identifies root cause and routes to correct agent:
   - Business rule issue → go to Phase 2 (PM)
   - Architecture flaw → go to Phase 3 (tech-analyst)
   - Logic/code bug → go to Phase 4 (implementer)
   - Infrastructure issue → go to Phase 4 (sre)
   - Documentation error → go to Phase 6 (doc-writer)
3. After fix implementation, run Phases 5-7 (review → test → finalize)

## Phase 2: Requirements & Planning
**When:** New feature, epic, or story needs definition.

1. Invoke `/product-manager` to interview the user deeply:
   - Uses grill-me style questioning
   - Covers: user personas, business outcomes, constraints, edge cases
   - Writes structured requirements into `.workflow/handoff.md`

2. Invoke `/requirements-reviewer` to validate requirements:
   - Checks clarity, completeness, testability
   - If issues found: loop back to product-manager, then re-review
   - If approved: requirements are ready

3. Invoke `/doc-writer` to write the PRD:
   - Creates `docs/PRD.md`, `docs/epics/epic-XX.md`
   - Creates `docs/stories/story-XX-X.md` with acceptance criteria

## Phase 3: Technical Analysis
**When:** Requirements are approved.

1. Invoke `/tech-analyst` to:
   - Define architecture pattern and technology stack
   - Perform autocrítica (self-review) before outputting
   - Break work into ordered technical tasks
   - Write architecture and tasks into `.workflow/plan.md`
   - Identify risks and assumptions

2. Invoke `/doc-writer` to write ADRs:
   - Creates `docs/architecture/adr-XXX-title.md` for each major decision

3. Invoke `/issue-creator` to create GitHub Issues:
   - One issue per task from plan.md
   - Each issue gets label `status: todo`
   - Record issue URLs in `.workflow/handoff.md`

## Phase 4: Implementation
**When:** Tasks are defined and issues created.
**For each issue** (record `Current Issue: <N>` in handoff.md):

1. Invoke `/implementer` for code changes:
   - Reads plan.md and handoff.md
   - Makes smallest change possible
   - Writes unit tests alongside
   - Runs tests locally
   - Sets label `status: in-progress`, comments on issue

2. Invoke `/sre` for infrastructure (in parallel, if needed):
   - Writes Terraform/Bicep/K8s manifests
   - Runs `terraform validate`
   - Sets label `status: in-progress`, comments on issue

## Phase 5: Review
**When:** Implementation is complete for an issue.

1. Invoke `/reviewer` to check the changes:
   - Dual checklist: correctness + security
   - Reads plan.md, handoff.md, and changed files
   - Sets label `status: in-review`, comments findings on issue
   - If issues found: set Next Agent back to implementer/sre
   - If clean: proceed to next phase

2. Invoke `/linter` to check code quality:
   - Runs ruff, eslint, prettier, etc. on changed files
   - Reports findings — does NOT fix
   - If issues found: set Next Agent back to implementer/sre
   - If clean: proceed to next phase

## Phase 6: Testing
**When:** Review and lint pass.

1. Invoke `/tester` to:
   - Run unit tests (fail-fast)
   - Run integration tests (if unit tests pass)
   - Implement missing e2e/integration tests
   - Sets label `status: testing`, comments results on issue
   - If failures: set Next Agent back to implementer
   - If all passing: proceed to next phase

## Phase 7: Finalize
**When:** All tests pass for all issues in the story/epic.

1. Invoke `/doc-writer` to update changelog:
   - Appends entry to CHANGELOG.md

2. Invoke `/finisher` to:
   - Generate conventional commit message (via caveman-commit skill)
   - Stage files and create PR via `gh pr create`
   - Write release notes to `.workflow/release-notes.md`
   - Set label `status: done`, comment PR URL on issue
   - Workflow complete

## Rules
- Always read `.workflow/handoff.md` before starting a phase.
- Always update `.workflow/handoff.md` after each phase with: Current Status, Next Phase, Decisions, Open Questions.
- `.workflow/` is the canonical record — not chat history.
- Make the smallest change that satisfies requirements.
- One cycle per review step by default. Escalate if critical.
- Use `CONSTITUTION.md` if present for project-specific rules.
