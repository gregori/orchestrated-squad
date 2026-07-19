# ADR 0001: Fonte canônica e renderers por runtime

- Status: accepted
- Data: 2026-07-19

## Contexto

As definições de agentes são mantidas manualmente para OpenCode, Claude,
VS Code e Devin. Isto cria drift e impede adicionar Codex com segurança.

## Decisão

`squad/` será a única fonte editável para agentes, workflows, comandos,
modelos, permissões, templates e schemas. Renderers determinísticos em
`scripts/render-target.*` gerarão os artefatos nativos. Todo arquivo gerado
deve declarar `generated_from`, a versão do renderer e o hash da fonte.

Os artefatos nativos continuam versionados para inspeção e instalação, mas
não devem ser editados diretamente. Um validador de drift comparará a saída
do renderer com os artefatos versionados em CI.

`.workflow/` é o registro portátil de execução. Chat e estado específico de
runtime são apenas transporte, nunca a fonte de verdade.

## Consequências

- Alterações de comportamento começam na especificação canônica.
- Renderers fazem somente adaptação de formato e capacidades do runtime.
- Gates determinísticos não são representados como agentes invocáveis.
- A Fase 1 introduzirá `squad/` e os renderers; esta fase fixa contratos e
  snapshots para que a migração possa ser verificada.
