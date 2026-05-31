# Technical Analysis Phase — Detailed Reference

## Architecture Patterns to Consider

| Pattern | Use When |
|---------|----------|
| Clean Architecture | Complex business logic, multiple I/O boundaries |
| Hexagonal (Ports & Adapters) | High testability needs, swapping infrastructure |
| MVC | Simple CRUD apps, monolithic frontend+backend |
| Event-Driven | Async workflows, microservices, integrations |

## Task Breakdown Template

```markdown
### Task 1: [Title]
- **Complexity:** small / medium / large
- **Dependencies:** Task 0
- **Files affected:** src/domain/x.py, src/api/y.py
- **Description:** What to implement
- **Acceptance:** How to verify
```

## Risk Assessment

| Risk Type | Example | Mitigation |
|-----------|---------|------------|
| Technical | New library with no team experience | Spike first |
| Dependency | External API rate limits | Caching, fallback |
| Data | Migration of existing data | Backward-compatible schema |
| Security | PII in new endpoint | Encryption, audit log |
