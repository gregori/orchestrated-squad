# Devin target

The Devin target has two distinct integration surfaces:

- `.devin/agents/<name>/AGENT.md` contains optional custom specialist profiles.
- `.agents/skills/squad-*/SKILL.md` contains portable command procedures,
  invoked as `@skills:squad-feature` (or another `squad-*` command).

The installer preserves an existing project `AGENTS.md` and inserts only the
delimited block from `managed-agents-block.md`. It never backs up or replaces
the whole file. The root session orchestrates profiles and records all state in
`.workflow/`.

Profile model policy: SWE-1.6 is used for simple or read-only work; SWE-1.7 is
used for code and critical analysis. Every profile declares `fallback-model:
swe`; availability is checked by the installer/doctor capability probe rather
than assumed.
