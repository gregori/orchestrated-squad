# Quality Phase — Detailed Reference

## Linter Detection

| File | Linter | Command |
|------|--------|---------|
| `pyproject.toml` | Ruff | `ruff check .` |
| `package.json` | ESLint | `npx eslint .` |
| `package.json` | Prettier | `npx prettier --check .` |
| `.eslintrc*` | ESLint | `npx eslint .` |

## Lint-First Strategy

1. Run linter on **all changed files** (not the entire project)
2. Capture exact command and output to lint-results.md
3. Report findings with file paths and line numbers
4. Do NOT fix — set Next Agent to implementer/sre for fixes

## Documentation Updates

When doc-writer runs after implementation:

- [ ] API docs updated if endpoints changed
- [ ] README updated if setup or usage changed
- [ ] Architecture docs updated if patterns changed
