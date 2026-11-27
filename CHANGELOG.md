# Changelog

## 0.8.0 — 2026-11-27

O fluxo passa a impor as próprias regras em código, e não só no texto das
skills. Roteiro completo em [docs/PROPOSTA-EVOLUCAO.md](docs/PROPOSTA-EVOLUCAO.md).

### Adicionado

- **Guard de transições** ([ADR 0002](docs/adr/0002-guard-de-transicoes.md)):
  grafo de fases em `squad/workflows/*.json`, pré-condições (gates aprovados
  após a última implementação, review registrado) e limite de ciclos. Toda
  transição recusada explica o motivo.
- **CLI de estado e gates:** `squad state init|status|activate|abandon|check|transition|annotate|record|reserve|release`
  e `squad gate <run-id>`, com os comandos dos gates vindos de
  `.squad/config.yaml`. Gate obrigatório sem comando fica `blocked`; o gate
  `scope` compara o diff com o `write_scope` reservado.
- **Workflow `squad-debug`** e **allowlist de escrita por fase**
  ([ADR 0003](docs/adr/0003-workflow-de-debug-e-allowlist-de-escrita.md)):
  fases somente leitura só podem alterar `.workflow/`.
- **Especialistas somente leitura sem ferramentas de escrita**
  ([ADR 0004](docs/adr/0004-especialistas-somente-leitura.md)): devolvem texto,
  e a raiz grava com `squad state record`.
- **Runtime local em `.squad/bin/`** e **hooks**
  ([ADR 0005](docs/adr/0005-runtime-local-e-hooks.md)): `hook read-only` por
  agente (Claude Code, VS Code, Codex) e `hook phase-guard` global (Claude Code,
  Devin CLI, Codex). `SQUAD_HOOK_LOG=1` registra as chamadas sem conteúdo.
- **Run ativa explícita** ([ADR 0006](docs/adr/0006-run-ativa-explicita.md)):
  `.workflow/active`, `squad state activate` e `squad state abandon`.
- `check:drift` verifica o modelo dos agentes Claude contra a classe canônica
  e que especialistas somente leitura não tenham caminho de escrita.
- `squad doctor` confere a versão do runtime local.

### Alterado

- Skills e hooks chamam `node .squad/bin/squad.mjs` em vez de
  `node scripts/gate-runner.mjs` (inexistente no projeto instalado) ou `npx`.
- `reviewer`, `tech-analyst` e `sre` no Claude Code passam a `opus`, como a
  classe `premium` já determinava.
- Prompts dos agentes apontam para `.workflow/runs/<run-id>/`.
- O merge de JSON do instalador deduplica itens de array por conteúdo.

### Removido

- `scripts/workflow-gates.mjs` (substituído pelo gate runner único).

### Atualização

Rode `npx @gregori/orchestrated-squad@0.8.0 update` no projeto. No Codex,
aprove os hooks novos com `/hooks` (projetos confiáveis). Nos hooks, a sintaxe
é POSIX: no Windows, use Git Bash ou Cygwin.
