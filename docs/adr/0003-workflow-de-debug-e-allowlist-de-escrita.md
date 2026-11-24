# ADR 0003: Workflow de debug e allowlist de escrita por fase

- Status: accepted
- Data: 2026-11-23

## Contexto

O ADR 0002 deixou o `squad-debug` fora do grafo de fases. Além disso, os
especialistas "somente leitura" (bug-triager, requirements-reviewer, reviewer,
tech-analyst) precisam escrever o resultado em `.workflow/`, e por isso
alguns perfis têm ferramentas de edição. Nada impedia que essas ferramentas
fossem usadas no código do produto.

Bloquear escrita por caminho depende do harness: alguns oferecem regras por
caminho, outros só por ferramenta, e nenhum cobre o shell de forma confiável.

## Decisão

1. `squad/workflows/debug.json`: `initialized → diagnosis → diagnosed →
   complete`, com uma volta opcional de `diagnosed` para `diagnosis` (conta
   ciclo). `diagnosed` exige o artefato `diagnosis`.
2. Cada workflow pode declarar `write_allowlist` por fase. Ao entrar numa fase
   com allowlist, o estado guarda uma foto (`phase_entry`: HEAD e hashes dos
   arquivos já alterados). Ao sair, `transition()` recusa se algum arquivo
   fora da allowlist mudou desde a foto, listando os arquivos.
3. Fases com allowlist `.workflow/`: `diagnosis` e `diagnosed` (debug);
   `requirements_review`, `review` e `verification` (feature).
4. Bloquear e retomar a mesma fase preserva a foto: a evidência de uma escrita
   indevida não se perde.

Esta é a camada **portável e determinística**: detecta em qualquer runtime,
inclusive escrita feita por shell. A prevenção nativa por harness (hooks,
permissões por caminho) fica como camada adicional, onde o harness suportar.

## Consequências

- Uma escrita indevida não é impedida no momento, mas impede o avanço da run
  até ser revertida ou a run ser bloqueada com motivo.
- `.workflow/` e `.squad/` nunca contam como alteração (são estado da squad).
- Arquivos já alterados quando a fase começou só contam se mudarem de novo.
