---
description: Finalize a verified squad run with an explicit checkpoint before commits, pull requests, or release actions.
---


# Squad finish

Check the run with `squad state check <run-id> --to ready_to_finish` (or `--to complete` if already there): the guard confirms that the required gates passed after the last implementation and that the independent review is recorded. If it refuses, report the reasons and stop. Summarize the completed work, remaining risks, and the exact Git or publication action proposed.

Do not create a commit, push, pull request, release, or external tracker item without explicit user approval. Once the approved finalization is complete, persist the evidence and run `squad state transition <run-id> --to complete --next "none"`.

`squad` means `npx -y @gregori/orchestrated-squad@latest`. Never edit `state.json` by hand.
