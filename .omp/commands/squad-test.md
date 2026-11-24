---
description: Run deterministic tests and optionally author missing tests.
---


# Squad test

Run the gates first. Only invoke the platform's tester or test-author directly when a bounded test gap remains; the root must not author tests itself.

```bash
squad gate <run-id> --gates test,scope
```

- If the gates passed → check if test gaps remain; invoke the tester only if needed, after reserving its `write_scope`.
- If a gate failed → return to the implementer with the gate evidence.

`squad` means `node .squad/bin/squad.mjs` (the local runtime, run from the project root). Change the run only through `squad state ...`; never edit `state.json` by hand.
