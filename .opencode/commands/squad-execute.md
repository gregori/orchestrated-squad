---
description: Execute an approved squad plan with direct Codex specialists and deterministic gates.
agent: planner
subtask: false
---


# Squad execute

Read the active run state and approved plan (`squad state status <run-id>`). The root assigns direct implementation or SRE children with disjoint `write_scope`, reserving each scope with `squad state reserve` before the writer starts; serialize overlapping changes. It must not implement the plan itself. Use workspace-write only for implementation specialists.

## Run state (guarded)

`squad` below means `node .squad/bin/squad.mjs`, the local runtime installed by the squad installer (run it from the project root; no network needed). Change a
run only through it; never edit `.workflow/runs/<run-id>/state.json` by hand.

- `squad state transition <run-id> --to <phase> --next "<next action>"` moves
  the run. A refusal (exit code 1) lists the reasons: report them and fix the
  cause instead of retrying. To stop, use `--to blocked --reason "<why>"`.
- `squad state reserve <run-id> --worker <name> --files <paths>` before a
  writer starts.
- Read-only specialists (product-manager, requirements-reviewer, tech-analyst,
  reviewer, bug-triager) cannot write files: they return their result as text.
  Record it with `squad state record <run-id> --artifact <name> --stdin`
  (for example `requirements`, `requirements-review`, `plan`, `review`,
  `diagnosis`).
- `squad state check <run-id> --to <phase>` previews a transition.
- Read-only phases (`requirements_review`, `review`, `verification`) may only
  change files under `.workflow/`; leaving them is refused if anything else
  changed since the phase started.

## Deterministic gates (REQUIRED before review)

```bash
squad gate <run-id>
```

Commands come from `.squad/config.yaml`, never from the agent. The run always
includes `test` and `scope` (changed files must be inside the reserved
`write_scope`); a required gate without a configured command is `blocked`, not
skipped. Results are appended to `.workflow/runs/<run-id>/checks.json`.

- Passed → transition to `review` and invoke the reviewer.
- Failed or blocked → return to the implementer with the gate output, or ask
  the user to configure the missing gate command. The transition to `review` is
  refused while any required gate is not passing.
