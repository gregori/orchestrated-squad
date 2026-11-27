# ADR 0006: Run ativa explícita

- Status: accepted
- Data: 2026-11-27

## Contexto

O `phase-guard` (ADR 0005) usava a run não concluída mais recente. Uma run
esquecida numa fase somente leitura bloqueava todas as edições fora de
`.workflow/` até alguém concluí-la ou bloqueá-la.

## Decisão

1. A run ativa é um ponteiro explícito em `.workflow/active`. `squad state init`
   e `squad state activate <run-id>` o definem; `complete` e `abandon` o
   removem.
2. `squad state abandon <run-id> --reason …` encerra a run sem concluí-la
   (`status: abandoned`). Ela não aceita mais transições.
3. O `phase-guard` só considera a run do ponteiro. Sem ponteiro, nada é
   restringido. `squad state status` sem argumento também usa o ponteiro.

## Consequências

- Começar uma run nova libera automaticamente a anterior das restrições de
  escrita; ela continua retomável com `activate`.
- Os prompts dos agentes passaram a apontar para `.workflow/runs/<run-id>/`
  (antes `.workflow/epic-XX/`, `.workflow/bug-XXX/` ou `.workflow/*.md`).
