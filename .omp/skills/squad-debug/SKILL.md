---
name: squad-debug
description: Diagnose a bug with evidence and a resumable handoff before making changes.
argument-hint: "<bug report>"
disable-model-invocation: true
---

# Squad debug

Create or resume a bug-triage run for `$ARGUMENTS` with `squad state init <run-id> --workflow squad-debug`, then invoke bug-triager directly. The root must not diagnose the bug itself; it records the specialist result, hypotheses, likely cause, affected files, and safe remediation scope with `squad state annotate`.

Do not edit product code in diagnosis mode. If a fix is requested after diagnosis, hand off the recorded scope to `squad-execute`, which runs under the guarded `squad-feature` phase graph.

`squad` means `npx -y @gregori/orchestrated-squad@latest`. Never edit `state.json` by hand.
