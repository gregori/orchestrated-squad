---
description: Execute a bounded feature through direct Codex specialists and deterministic gates.
---


# Squad feature

The root session owns the run and creates specialists directly; `agents.max_depth = 1` prohibits delegation chains. It is an orchestrator, not a substitute for a specialist: requirements go to product-manager then requirements-reviewer, design to tech-analyst, implementation to implementer or SRE, documentation to doc-writer, review to reviewer, and test work to the platform's tester or test-author. Assign non-overlapping write scopes to writers. Keep reviewers and analysts read-only.

Create the run with `squad state init <run-id>`, then invoke the native subagent for every LLM phase immediately. The root may only inspect state, coordinate results, record transitions, and run deterministic gates; it must not perform requirements, design, implementation, review, documentation, or test-authoring itself.

Phases: `initialized → requirements → requirements_review → design → planned → implementation → deterministic_checks → review → verification → ready_to_finish → complete`. After review, `implementation` (another cycle) or `test_authoring` are also allowed; at most two review cycles, then the run must be `blocked` with a reason.

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

Record the independent review with `squad state annotate <run-id> --artifact review=<path>` before `verification`, and update the handoff before finishing.
