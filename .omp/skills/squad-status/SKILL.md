---
name: squad-status
description: Show the current resumable squad run, its phase, gates, blockers, and next action.
argument-hint: "[run-id]"
disable-model-invocation: true
---

# Squad status

Run `squad state status $ARGUMENTS` (with no argument it selects the most recently updated active run). Do not change files.

Report the run id, workflow, phase, status, current cycle, next action, reservations, `blocked_reason` when blocked, and open questions from the run handoff. Read `checks.json` only when it exists; when it is absent, report “no gates have run yet” rather than treating it as an error. Mention the last `transition_refused` event in `events.jsonl`, if any, with its reasons. If no run exists, say so and suggest `/squad-init` or `/squad-feature`.

`squad` means `npx -y @gregori/orchestrated-squad@latest`.
