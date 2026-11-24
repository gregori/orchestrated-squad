---
description: Plan a feature through the portable squad workflow without changing application code.
---


# Squad plan

The root session owns orchestration. Create or resume the run with `squad state init <run-id>` / `squad state status <run-id>`, then invoke direct specialist children for every LLM phase. Never ask a specialist child to create further children. The root may inspect state and record transitions, but never writes requirements, plans, or documentation itself.

Invoke product-manager to collect requirements, then requirements-reviewer for the structured review. Invoke tech-analyst for design or architecture decisions, and doc-writer for approved planning documents. The root incorporates their results into the run state and handoff. Do not change application code. The plan ends at `planned`; run `git status --short` as the deterministic planning check.

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
