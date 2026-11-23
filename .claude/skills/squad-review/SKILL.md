---
name: squad-review
description: Run deterministic gates and an independent read-only review.
---

# Squad review

Run deterministic gates FIRST, then invoke the reviewer directly with read-only access; the root must not review the implementation itself.

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

Record findings and evidence with `squad state annotate <run-id> --artifact review=<path>`; never use the reviewer to edit fixes.

## Run state (guarded)

`squad` below means `npx -y @gregori/orchestrated-squad@latest` (or the `squad` binary, if installed). Change a
run only through it; never edit `.workflow/runs/<run-id>/state.json` by hand.

- `squad state transition <run-id> --to <phase> --next "<next action>"` moves
  the run. A refusal (exit code 1) lists the reasons: report them and fix the
  cause instead of retrying. To stop, use `--to blocked --reason "<why>"`.
- `squad state reserve <run-id> --worker <name> --files <paths>` before a
  writer starts; `squad state annotate <run-id> --artifact review=<path>` after
  the independent review is written.
- `squad state check <run-id> --to <phase>` previews a transition.
- Read-only phases (`requirements_review`, `review`, `verification`) may only
  change files under `.workflow/`; leaving them is refused if anything else
  changed since the phase started.
