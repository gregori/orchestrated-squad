---
description: Show the next safe squad action and continue it when no user decision is needed.
---


# Squad next

Read the selected active run as for `squad-resume`. First state the recorded next action in one sentence. Check it with `squad state check <run-id> --to <phase>` when it implies a phase change. If it is reversible and needs no product, security, deployment, or external-publication decision, invoke the specialist selected by `Next Agent` or the current phase; do not execute specialist work in the root session. Persist the result after the subagent returns with `squad state transition` or `squad state annotate`. Otherwise stop and ask for that specific decision.

`squad` means `node .squad/bin/squad.mjs` (the local runtime, run from the project root). Never edit `state.json` by hand.
