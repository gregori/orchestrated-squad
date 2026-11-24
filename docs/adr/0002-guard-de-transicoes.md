# ADR 0002: Guard de transições e gate runner único

- Status: accepted
- Data: 2026-11-23

## Contexto

As regras do fluxo (ordem das fases, gates antes do review, limite de dois
ciclos) estavam só nas skills. `transition()` aceitava qualquer patch, um gate
sem comando virava `skipped` e o agregado saía `passed`, havia dois gate
runners com semânticas diferentes e nada impedia editar fora do `write_scope`.
As skills chamavam `node scripts/gate-runner.mjs`, que não existe no projeto
instalado, com comandos escolhidos pelo próprio agente.

## Decisão

1. `squad/workflows/feature.json` declara `transitions`, `preconditions`,
   `cycle_transitions` e `required_gates`. `transition()` valida todo patch
   contra esse grafo e recusa com `TransitionError` e motivos legíveis; cada
   recusa vira um evento `transition_refused`.
2. Pré-condições determinísticas: `gates_passed` (gates obrigatórios passaram
   **depois** da última entrada em `implementation`) para `review`,
   `verification` e `ready_to_finish`; `review_recorded` (artefato `review`)
   para `verification` e `ready_to_finish`.
3. `review → implementation` e `verification → implementation` contam ciclos;
   acima de `max_cycles` a transição é recusada e a run precisa ir para
   `blocked` com motivo. Uma run bloqueada só volta para a fase de onde parou.
4. Um único `scripts/gate-runner.mjs`. Os comandos vêm do `.squad/config.yaml`,
   nunca do agente. Gate obrigatório sem comando dá `blocked`. O gate `scope`
   compara o diff desde o `base_ref` da run com a união das reservas. Arquivos
   que já estavam alterados quando a run começou (`baseline`, com hash) só
   contam se mudarem depois.
5. A CLI `squad state …` / `squad gate …` é o único caminho suportado para
   mudar uma run. (Originalmente via `npx …@latest`; o ADR 0005 trocou pelo
   runtime local `node .squad/bin/squad.mjs`.)
6. `check:drift` também compara o modelo dos agentes Claude com a classe
   canônica.

## Consequências

- Uma skill ou um agente que tente pular etapas recebe uma recusa explicável,
  em qualquer runtime.
- Novas regras (perguntas bloqueantes, prova de vermelho, fatias) entram como
  pré-condições, sem reescrever as skills.
- Workflows sem definição em `squad/workflows/` (por exemplo `squad-debug`)
  ainda não são validados pelo grafo.
- As skills dependem do pacote via `npx`; fixar a versão por projeto fica para
  um passo posterior.
