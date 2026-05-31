# Finalize Phase — Detailed Reference

## Commit Message Format

```
<type>(<scope>): <subject> (<gitmoji>)

<body> (optional, 1-3 bullets)
```

### Types & Gitmoji

| Type | Gitmoji | When |
|------|---------|------|
| feat | ✨ | New feature |
| fix | 🐛 | Bug fix |
| docs | 📝 | Documentation |
| test | ✅ | Tests |
| refactor | ♻️ | Code refactoring |
| chore | 🔧 | Maintenance, config |
| infra | 🏗️ | Infrastructure |
| security | 🔒 | Security fix |

### Subject Rules
- Max 50 characters
- Imperative mood ("Add" not "Added" or "Adds")
- No trailing period

## Release Notes Categories

| Category | Description |
|----------|-------------|
| Features | New user-facing capabilities |
| Fixes | Bug fixes and corrections |
| Refactors | Code improvements (no behavior change) |
| Tests | Test additions or changes |
| Documentation | Doc updates |
| Infrastructure | CI/CD, deploy, config changes |
| Security | Security fixes and improvements |

## PR Creation

```bash
gh pr create \
  --title "<commit-subject>" \
  --body "<summary of changes, link to issues>" \
  --label "status: done"
```

## Final Issue Comment

```markdown
**Finisher**: 🚀 PR created: <URL>
Workflow complete. Changes:
- Feature: summary
- Fixes: summary
- Tests: N new tests
```
