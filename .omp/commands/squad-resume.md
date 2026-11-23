---
description: Continue the most recent active squad run from its recorded next action.
---


# Squad resume

Find the requested run with `squad state status <run-id>`, or the most recently updated active run with `squad state status`. Read its `handoff.md`; read `checks.json` only if it exists. Its absence means no gate has run yet, not a broken run. Continue exactly from `next_action` and the recorded phase; do not repeat completed phases.

The invoking session is the root orchestrator. Reading state is its only direct LLM work. Resolve `Next Agent` in the handoff (or derive it from the phase) and immediately invoke that native specialist subagent with the run id, phase, next action, and relevant handoff context. Use product-manager for requirements, requirements-reviewer for requirements review, tech-analyst for design, doc-writer for approved documentation, implementer or SRE for delivery, reviewer for review, tester or test-author for testing, bug-triager for diagnosis, and finisher where that platform provides it. The root must never perform a specialist phase itself and specialists must not create another subagent.

Every phase change goes through `squad state transition <run-id> --to <phase> --next "<next action>"`. If it is refused, report the listed reasons and act on them (run the gates, record the review, or block the run); never edit `state.json` to get past a refusal. If the run is blocked, report `blocked_reason` and request only the decision needed to unblock it; a blocked run resumes only to the phase where it stopped.

`squad` means `npx -y @gregori/orchestrated-squad@latest` (or the installed `squad` binary).
