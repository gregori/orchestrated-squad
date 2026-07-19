# Orchestrated Squad — Devin instructions

The root Devin session owns orchestration. Keep durable state in `.workflow/`; do
not rely on chat history. Use a command skill from `.agents/skills/`:

- `@skills:squad-plan` for planning only;
- `@skills:squad-feature` for a feature;
- `@skills:squad-execute` to resume an approved plan;
- `@skills:squad-review` or `@skills:squad-test` for quality work.

Specialists are custom profiles in `.devin/agents/<name>/AGENT.md`. They are
not skills. Read-only profiles may run in background only with their listed
pre-approved tools. Profiles that can edit, execute mutations, or require
approval run foreground. If `swe-1.7` is unavailable, use `swe`; record the
fallback in the run state. Do not claim that subagents are free.

Use deterministic gates for lint, tests, work-item publication and Git/PR
preparation. Publishing, push, tags and PR creation require an explicit root
checkpoint. Before every transition, update the run handoff and state.
