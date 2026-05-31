# Planning Phase — Detailed Reference

This file provides additional depth for Phase 2 (Requirements & Planning) in the orchestrator.

## Product Manager Interview — Grill Style

The product-manager skill should ask questions in this order, one at a time:

1. **Who is the user?** — Define primary personas
2. **What problem are we solving?** — Business outcome
3. **What does success look like?** — Measurable metrics
4. **What are the constraints?** — Time, budget, tech, compliance
5. **What are the edge cases?** — Error states, empty states, permissions
6. **What is NOT in scope?** — Explicit out-of-scope items

## Acceptance Criteria Format

Each story should have Given/When/Then criteria:

```gherkin
Given [context/state]
When [action is performed]
Then [expected outcome]
```

## Requirements Review Checklist

The requirements-reviewer skill checks:

- [ ] Every story has a clear user persona
- [ ] Acceptance criteria are testable (can verify pass/fail)
- [ ] Edge cases are documented
- [ ] Out-of-scope is explicitly stated
- [ ] No technical/architecture language in requirements
