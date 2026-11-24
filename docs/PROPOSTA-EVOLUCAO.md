# Proposta: evolução do fluxo do orchestrated-squad

Roteiro de oito mudanças incrementais, um PR por passo. O objetivo é que
histórias mal refinadas não virem requisitos inventados, que os testes
especifiquem o comportamento antes do código e que o fluxo **imponha** as
próprias regras em vez de depender de o LLM seguir a skill.

A arquitetura atual se mantém: estado em `.workflow/`, gates determinísticos,
classes de modelo, `write_scope` disjunto e no máximo dois ciclos de review.

| # | Mudança | Problema que resolve | Status |
|---|---|---|---|
| 0 | Guard de transições e gate runner único | Regras que dependem do LLM seguir a skill | **Implementada** ([ADR 0002](adr/0002-guard-de-transicoes.md)) |
| 1 | Gate de perguntas bloqueantes | Requisitos inventados em histórias vagas | Proposta |
| 2 | Testes de aceite com prova de vermelho | Testes que confirmam o código em vez da spec | Proposta |
| 3 | Fast path sem handoff de design | Custo de handoff em histórias pequenas | Proposta |
| 4 | Revisor de outra família (`preferred`) | Revisor com os mesmos pontos cegos do autor | Proposta |
| 5 | Métricas de resultado e tokens por tarefa | Falta de dados para decidir o que se paga | Proposta |
| 6 | PRs por fatia entregável | PR único e grande no fim, difícil de revisar | Proposta |
| 7 | Escolha dinâmica de modelos | Classe fixa por papel, que não acompanha o risco da tarefa | Item 1 implementado (drift de modelo) |

O plano também serve de base para uma versão corporativa (seção
*Portabilidade para o trabalho*): compartilha-se a spec, não o código.

## Mudança 0: guard de transições e gate runner único — implementada

O que o código fazia antes:

| Arquivo | Comportamento | Consequência |
|---|---|---|
| `scripts/workflow-state.mjs` | `transition()` aplicava `{ ...previous, ...patch }` sem validar | Qualquer entrada podia pular etapas |
| `scripts/gate-runner.mjs` | Gate sem comando virava `skipped` e o agregado saía `passed` | Gate obrigatório podia não rodar sem ninguém perceber |
| `scripts/workflow-gates.mjs` | Segundo runner, com outra semântica (`success`, erro sem comando) | Duas semânticas para a mesma coisa |
| `reserveFiles()` | Só detectava conflito entre reservas | Nada impedia editar fora da reserva |
| Skills | Chamavam `node scripts/gate-runner.mjs` com comandos escolhidos pelo agente | O script não existe no projeto instalado, e o agente escolhia o comando |

O que mudou está descrito no [ADR 0002](adr/0002-guard-de-transicoes.md) e no
README (*Run state and gates*). O [ADR 0003](adr/0003-workflow-de-debug-e-allowlist-de-escrita.md)
estendeu o guard ao `squad-debug` e acrescentou a allowlist de escrita por
fase (fases somente leitura só podem alterar `.workflow/`). O
[ADR 0004](adr/0004-especialistas-somente-leitura.md) removeu as ferramentas de
escrita dos especialistas somente leitura em todos os runtimes e acrescentou um
hook de negação no Claude Code e no VS Code. O
[ADR 0005](adr/0005-runtime-local-e-hooks.md) trocou o `npx` por um runtime
local em `.squad/bin/` e acrescentou um hook global por fase (Claude Code e
Devin CLI).

## Mudança 1: gate humano de perguntas em aberto

- Requirements produz, além da spec, perguntas classificadas por impacto
  (`blocking` · `assumption` · `nice_to_have`), num artefato em `.workflow/`
  (por exemplo `open-questions.yaml`, com `proposed_default`, `answer`,
  `resolution: human_answer | default_applied` e `affects: [AC-…]`).
- Pergunta `blocking` aberta impede `→ design`: nova pré-condição do guard.
- `assumption` segue com o default, registrado como `default_applied` e
  mostrado no resumo e no PR. O `squad-yolo` nunca pula `blocking`.
- **Proveniência:** o código comprova o comportamento *atual*; o comportamento
  *desejado* vem da história ou de uma decisão humana. Lacuna de produto sem
  fonte vira pergunta.
- Depois da resposta, a spec é atualizada e os `AC` em `affects` passam de novo
  pelo requirements review. Reaproveitar a seção *Open Questions* do
  `handoff.md` e a skill `grill-me`.
- Teste de aceite: a pergunta bloqueia o design, sobrevive à troca de sessão e,
  respondida, atualiza a spec antes de liberar a execução.

## Mudança 2: testes de aceite antes da implementação

- Fase nova `acceptance_tests` entre `planned` e `implementation`. Piloto numa
  stack só: pytest com JUnit XML.
- Critérios em Given/When/Then com ids `AC-n`; o test-author (não o
  implementador) escreve um teste por `AC`, marcado (`@pytest.mark.ac("AC-1")`).
- **Prova de vermelho por `AC`:** teste coletado e com `failure` (não `error`).
  Teste que já passa vai para verificação: pode cobrir comportamento a preservar.
- **Congelamento:** sha256 dos testes de aceite e da configuração de coleta no
  vermelho, conferido no verde. Correção de teste errado passa pelo
  test-author e renova a prova.
- Verification cruza `AC` × teste × resultado. Critérios `manual: true` exigem
  resultado registrado antes de `complete`.

## Mudança 3: fast path sem handoff de design

- Ordem: requirements → plano curto (raiz, leitura) → roteamento → testes de
  aceite → implementação. Em `small`, o tech-analyst não é chamado; o
  implementador continua independente.
- `small` quando: ≤ 3 arquivos de produção, 0 perguntas `blocking`, sem
  schema/contrato público/segurança/migração, ≤ 5 `AC` (limites no config).
- Se precisar de arquivo fora do plano, para **antes** de ampliar o
  `write_scope`, guarda o diff parcial e volta para `design` como `standard`.
- Override: `squad-feature --path small|standard`.

## Mudança 4: revisor de outra família de modelo

- Hoje os perfis Devin `implementer` e `reviewer` usam o mesmo modelo
  (`swe-1.7`). Primeiro passo: trocar o modelo do revisor.
- Política `review.diversity: preferred | required | off`. `required` só onde
  houver evidência do modelo efetivo gerada pelo harness (transcript, JSON da
  CLI), nunca por um JSON escrito pelo próprio revisor.
- Runtimes de família única (Claude Code, Codex) usam um gate que chama outra
  CLI em modo read-only (`codex exec`, `claude -p`, `opencode run`).
- **Devin:** `model` fixado no implementador e no revisor (nunca o roteador nem
  `subagent_general`), revisor com `allowed-tools: [read, grep, glob]`,
  verificação estática dos `AGENT.md` e registro `source: configured`.

## Mudança 5: métricas de resultado e tokens por tarefa

- Qualidade: nota e minutos de correção no `squad-finish`, `AC` satisfeitos,
  correções pedidas por uma avaliação comum. `review_cycles` vira sinal secundário.
- Tokens por tarefa: `span_start`/`span_end` no `events.jsonl` (run, fase,
  tarefa/`AC`, agente, runtime, id da sessão) e um coletor por runtime, com
  `attribution: id | window | unavailable`.
- Pré-requisito: o sanitizador de `scripts/telemetry.mjs` remove chaves com
  `token`/`path` (some `tokens_input`, `fast_path`). Trocar por allowlist; o
  `contribute` deve enviar só agregados.
- Comparação: mesmo commit, worktrees isolados, sessões novas, avaliação cega
  quando possível, 3 a 5 histórias e ablação por fase.

## Mudança 6: PRs por fatia entregável

- Cada fatia (conjunto de `AC` que deixa a `main` verde sozinho) vira um PR.
  Ondas decidem *como executar*; fatias decidem *onde cortar o PR*.
- O plano declara fatias (`AC`, `write_scope`, `depends_on`, branch base).
  Gates, review e verification rodam por fatia; `squad-finish --slice <id>`.
- `.workflow/` guarda fatia → branch → PR → estado; PRs empilhados quando há
  dependência (`git rebase --update-refs`). Funcionalidade parcial fica atrás
  de flag. Exige adaptador real no `scripts/git-pr.mjs`.

## Mudança 7: escolha dinâmica de modelos

1. **Drift (implementado):** o `check:drift` compara o frontmatter de
   `.claude/agents/` com a classe do registry e do `models.yaml`
   (`economy → haiku`, `standard → sonnet`, `premium → opus`).
2. **Roteador:** `squad/routing.yaml` com classe base por papel, regras de
   `escalate`/`deescalate` (risco do plano, ciclo de review, falhas de gate,
   suposições) e orçamento de chamadas `premium`. `scripts/route.mjs` grava a
   classe e o motivo em `.workflow/`. O LLM não escolhe o próprio modelo.
3. **Catálogo local** (`.squad/models.local.yaml`): classe → modelo por runtime,
   com família; o `doctor` valida.
4. **Mecanismo:** Claude Code escolhe o modelo por chamada; demais runtimes usam
   variantes geradas (`implementer@standard`, `implementer@premium`).
5. Ajuste pela telemetria, sempre por decisão humana.

## Integração com a memória entre projetos (teammem)

Componente separado. O squad usa só `search`, `read` e `propose` (CLI ou MCP),
nunca `promote`. Requirements consulta decisões e convenções antes de abrir
perguntas; o plano consulta armadilhas dos arquivos a tocar; o review gera
candidatos a `gotcha`; o finish propõe os aprendizados da run.

## Portabilidade para o trabalho

Extrair um `docs/SPEC.md` (grafo de fases e pré-condições, schema de
`.workflow/`, contrato de gate, allowlist de telemetria, contrato dos comandos)
com os fixtures de `tests/fixtures/` como teste de conformidade. Perfil `work`:
Devin como runtime principal, distribuição por registry interno, `contribute`
desligado, diversidade `preferred`.

## Ordem de implementação

1. ~~Guard de transições e gate runner único (mudança 0), com drift de modelo.~~
2. Medição local mínima (mudança 5, parte 1) e baseline.
3. Gate de perguntas (mudança 1).
4. Testes de aceite em pytest (mudança 2).
5. Fast path medido (mudança 3).
6. PRs por fatia (mudança 6).
7. Roteador de modelos (mudança 7, itens 2 a 5).
8. Em paralelo: diversidade `preferred` (mudança 4).
9. Depois do passo 4: extrair o `docs/SPEC.md` para a versão do trabalho.
