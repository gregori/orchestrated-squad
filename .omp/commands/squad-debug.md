---
description: Diagnose a bug with evidence and a resumable handoff before making changes.
---


# Squad debug

Create or resume a bug-triage run for `$ARGUMENTS` with `squad state init <run-id> --workflow squad-debug`. Phases: `initialized → diagnosis → diagnosed → complete` (or back from `diagnosed` to `diagnosis` for another round, at most two).

1. `squad state transition <run-id> --to diagnosis --next "diagnose"`, then invoke bug-triager directly. The root must not diagnose the bug itself.
2. bug-triager returns its result as text (hypotheses, likely cause, affected files, safe remediation scope); it cannot write files. Record it with `squad state record <run-id> --artifact diagnosis --stdin`.
3. `squad state transition <run-id> --to diagnosed --next "<proposed fix scope>"`.

Diagnosis is read-only: `diagnosis` and `diagnosed` may only change files under `.workflow/`. Leaving either phase is refused if any other file changed since the phase started, listing the files; revert them or move the run to `blocked` with a reason. Do not edit product code in diagnosis mode.

If a fix is requested after diagnosis, close this run (`--to complete`) and hand off the recorded scope to `squad-execute`, which runs under the guarded `squad-feature` phase graph.

`squad` means `npx -y @gregori/orchestrated-squad@latest`. Never edit `state.json` by hand.
