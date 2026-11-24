---
name: squad-yolo
description: Drive a bounded squad feature through every safe phase with minimal interruptions.
argument-hint: "<feature request or run-id>"
disable-model-invocation: true
---

# Squad yolo

Treat `$ARGUMENTS` as either a feature request or an existing run id. For a new request, create a resumable run with `squad state init <run-id>`. For an existing run, resume it.

Advance requirements, review, design, implementation, deterministic checks, independent review, verification, and handoff without pausing for routine confirmations. Invoke a native specialist subagent for every LLM phase; the root only coordinates and runs deterministic gates. Respect write scopes and the two-review-cycle limit. Stop only for a material product ambiguity, destructive or irreversible action, security risk, missing authority, failed gate requiring a decision, a refused transition you cannot resolve, or external publication. Persist phase, evidence, next action, and open questions in `.workflow/` after each phase.

## Run state (guarded)

`squad` below means `npx -y @gregori/orchestrated-squad@latest` (or the `squad` binary, if installed). Change a
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
