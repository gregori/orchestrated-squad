---
description: Guide for planning epics with the orchestrated-squad agent workflow
---

# Guia: Iniciando um Épico com orchestrated-squad

## Visão Geral

O orquestrador `planner` coordena todos os agentes. Você só precisa descrever o que quer — o planner gerencia o resto.

## Fluxo

### 1. Chamar o Planner
Descreva sua ideia para o planner. Ele irá orquestrar todo o fluxo automaticamente.

### 2. Fluxo Automático
```
planner
  ├── PM → RR (ciclo até aprovar) → doc-writer (PRD)
  ├── Para cada história:
  │     PM → RR → doc-writer → tech-analyst
  │     → doc-writer (ADR) → issue-creator
  │     → implementer + sre (paralelo)
  │     → reviewer → linter → tester
  │     → doc-writer (changelog) → finisher
  └── Bugs: bug-triager (quando chamado diretamente)
```

### 3. Ciclo de Bugs
Chame `@bug-triager` diretamente com a descrição do bug. Ele analisa e roteia para o agente apropriado.

## Template .workflow/handoff.md

```yaml
## Current Status
- Phase: epic-refinement / story-execution / implementation / review / complete

## Decisions
- ID-001: Decision description and rationale

## Next Agent
- agent-name

## Open Questions
- Unresolved items
```

## Referências
- [AGENTS.md](../AGENTS.md) — Regras de workflow
- [agents/planner.md](./agents/planner.md) — Orchestrador principal
