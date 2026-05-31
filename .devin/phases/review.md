# Review Phase — Detailed Reference

## Code Review Checklist

- [ ] Does the code satisfy the acceptance criteria?
- [ ] Are there side effects on unrelated code?
- [ ] Is error handling appropriate (no silent failures)?
- [ ] Are function/method signatures clear and typed?
- [ ] Are there unnecessary abstractions or over-engineering?
- [ ] Are tests meaningful (test behavior, not implementation)?

## Security Review Checklist

| Category | Check |
|----------|-------|
| Secrets | Any hardcoded API keys, tokens, passwords, connection strings? |
| Injection | User input used in shell commands, SQL queries, or eval()? |
| Auth | Endpoints properly authenticated? Role checks in place? |
| Data | PII logged or exposed in error messages? |
| Crypto | Weak algorithms (MD5, SHA1)? Predictable randomness? |
| Validation | All inputs validated for type, range, format? |

## Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| High | Security vulnerability, data loss, broken functionality | Block, fix required before merge |
| Medium | Maintainability concern, missing edge case | Fix recommended, can defer |
| Low | Style inconsistency, minor optimization | Note for future improvement |
