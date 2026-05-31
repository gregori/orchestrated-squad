# Testing Phase — Detailed Reference

## Test Execution Order (Fail-Fast)

1. **Layer 1: Unit Tests**
   - Fast, focused, no external dependencies
   - Command: `pytest tests/unit/ -x --tb=short` (Python) or `npx vitest run` (JS/TS)
   - If ANY fail → STOP, report, route back to implementer

2. **Layer 2: Integration Tests**
   - Tests with DB, API, or external services
   - Command: `pytest tests/integration/ -x --tb=short`
   - If ANY fail → STOP, report, route back to implementer

3. **Layer 3: E2E / Functional Tests**
   - Full system tests (if configured)
   - If ANY fail → STOP, report, route back to implementer

## Test Quality Checklist

- [ ] Unit tests cover all new functions/methods
- [ ] Tests verify behavior, not implementation details
- [ ] Edge cases tested (empty input, invalid data, boundaries)
- [ ] Error paths tested (exceptions, failures)
- [ ] No flaky tests (deterministic, isolated)

## Coverage Reporting

```bash
# Python
pytest tests/ --cov=src/ --cov-report=term-missing

# TypeScript
npx vitest run --coverage
```
