# Implementation Phase — Detailed Reference

## Implementer Guidelines

### Before Writing Code
1. Read plan.md fully — understand all tasks, not just yours
2. Check existing code patterns in neighboring files
3. Identify existing tests to understand expected behavior

### While Writing Code
- Make the smallest change that satisfies the acceptance criteria
- Follow existing naming conventions and file structure
- Write unit tests alongside implementation (not after)
- Use the project's established patterns (Clean Architecture layers, etc.)

### Common Patterns by Stack

| Stack | Pattern |
|-------|---------|
| Python + FastAPI | domain/models/ → application/usecases/ → infrastructure/repositories/ → api/routes/ |
| React + TypeScript | components/ → hooks/ → services/ → types/ |
| Terraform | modules/ → environments/ (dev, staging, prod) |

### Self-Verification Checklist
- [ ] Code compiles/parses without errors
- [ ] Unit tests pass
- [ ] No lint errors on changed files
- [ ] No debug code, TODOs, or commented-out code left behind
- [ ] No secrets or hardcoded credentials

## SRE Guidelines

### Before Writing Infrastructure
1. Read plan.md for infrastructure requirements
2. Check existing Terraform modules for reuse
3. Verify cloud provider quotas if provisioning new resources

### Infrastructure Best Practices
- Use remote state (S3, Azure Storage, OCI Object Storage)
- Tag all resources with project name, environment, and owner
- Follow least privilege for IAM roles and service accounts
- Enable encryption at rest and in transit
- Use modules for reusable infrastructure patterns

### Self-Verification Checklist
- [ ] `terraform validate` passes
- [ ] `terraform plan` shows expected changes only
- [ ] No hardcoded secrets (use variables + vault/env)
- [ ] All resources have tags/labels
- [ ] Backward compatible — no destroy of existing resources without migration plan
