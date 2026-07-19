# Plano de otimização e portabilidade da squad

**Status:** proposto  
**Data:** 18 de julho de 2026  
**Plataformas:** Codex, Claude Code, OpenCode e Devin CLI  
**Entrada principal:** `relatorio_otimizacao_coding_agents.md`

## 1. Objetivo e critérios de sucesso

Ao final da implementação, a squad deverá:

- funcionar nativamente nos quatro runtimes;
- oferecer workflows por comandos curtos, semelhantes aos do GSD;
- usar subagentes no formato oficialmente suportado por cada runtime;
- compartilhar estado por `.workflow/`, sem depender do histórico do chat;
- aplicar a política de modelos, escalonamento e economia do relatório;
- executar lint, build, testes existentes, Git e GitHub por automação determinística;
- limitar ciclos, paralelismo e consumo premium;
- gerar adaptadores de uma especificação canônica, reduzindo drift entre cópias.

Metas iniciais:

- 100% de lint, build, testes existentes e Git sem LLM;
- no máximo dois ciclos de revisão;
- zero sobrescrita de configuração do projeto alvo;
- zero writer paralelo com escopo sobreposto;
- 100% das transições registradas em `.workflow/`;
- pelo menos 20% menos chamadas LLM por epic que o baseline atual, sem perda nos critérios de aceite.

Este documento planeja a mudança; não implementa os adaptadores.

## 2. Diagnóstico do repositório

### 2.1 Estado atual

| Área | Situação |
|---|---|
| OpenCode | 13 definições em `.opencode/agents/` e `opencode.json` |
| Claude Code | 13 definições em `.claude/agents/` e `.claude/settings.json` |
| Devin CLI | `AGENTS.md`, 13 arquivos tratados como skills, fases e conversores em `.devin/` |
| VS Code Copilot | 13 definições em `.github/agents/` |
| Codex | não há `.codex/config.toml`, `.codex/agents/` nem target no instalador |
| Estado | template mínimo em `.workflow/template/handoff.md` |
| Instalação | `install.sh` e `install.ps1` aceitam `opencode`, `vscode`, `devin` e `claude` |

### 2.2 Lacunas

1. Codex não está implementado.
2. O target Devin modela subagentes como `.devin/skills/<nome>/SKILL.md`; a documentação atual define perfis em `.devin/agents/<nome>/AGENT.md`. Skills são procedimentos, não substitutos de perfis.
3. As definições são duplicadas manualmente entre runtimes, favorecendo drift.
4. `linter`, parte de `tester`, `issue-creator` e `finisher` consomem LLM em tarefas mecânicas, contrariando o relatório.
5. Modelos OpenCode estão defasados: por exemplo, `glm-5.1` em vez de `glm-5.2` e `qwen3.6-plus` em vez de `qwen3.7-plus`.
6. O mapeamento Claude não reserva Opus de modo sistemático para escalonamento crítico.
7. Não existe uma camada uniforme de comandos; a entrada depende de `@planner` ou interpretação de `AGENTS.md`.
8. O instalador Devin substitui o `AGENTS.md` raiz e pode apagar instruções do projeto alvo.
9. O handoff não registra run, artefatos, gates, tentativas, orçamento nem concorrência.
10. Não há testes que comprovem descoberta e invocação nos runtimes.

## 3. Restrições confirmadas

| Runtime | Definição | Orquestração | Restrição relevante |
|---|---|---|---|
| Codex | `.codex/agents/<nome>.toml`; requer `name`, `description`, `developer_instructions` | sessão principal cria agentes; instrução de projeto ou skill pode exigir delegação | `agents.max_depth` padrão 1; filhos herdam sandbox/aprovações da sessão |
| Claude Code | `.claude/agents/<nome>.md`, frontmatter YAML | ferramenta `Agent`, restringível por `Agent(tipo)` | filho não recebe histórico completo; não dispõe de `AskUserQuestion` |
| OpenCode | `.opencode/agents/<nome>.md` ou `opencode.json` | agente primário chama `mode: subagent`; command escolhe agente | writers concorrentes podem conflitar no workspace |
| Devin CLI | `.devin/agents/<nome>/AGENT.md` ou `.agents/agents/...` | principal escolhe perfil foreground/background | background só usa ferramentas pré-aprovadas; custom profiles são experimentais |

Consequência: o **orquestrador roda na sessão principal**, acionado por command/skill. Especialistas são filhos diretos. Não iniciar `planner` como filho e esperar que ele crie toda a árvore no Codex com `max_depth=1`.

## 4. Arquitetura alvo

### 4.1 Fonte canônica

```text
squad/
  agents/                 # prompts e metadados canônicos
  workflows/              # feature, bug, quick e review
  commands/               # templates squad-*
  models.yaml             # classes e mapeamentos por runtime
  permissions.yaml        # capacidades mínimas por papel
  config.schema.json      # tracking, telemetria e opções portáveis
  schemas/                 # state, handoff e result
  templates/               # PRD, story, ADR, issue, review e release
scripts/
  render-target.*          # gera adaptadores
  validate-target.*        # valida formato, referências e permissões
  workflow-gates.*         # lint, build, testes, Git e GitHub
```

Os arquivos nativos permanecem versionados, mas tornam-se gerados. Um cabeçalho `generated_from` e teste de drift impedem edição divergente.

Cada projeto recebe `.squad/config.yaml` para escolhas estruturadas. `AGENTS.md` pode explicar políticas locais e apontar para esse arquivo, mas não armazena tokens, credenciais nem configuração específica de fornecedor.

### 4.2 Artefatos por target

| Target | Artefatos gerados/instalados |
|---|---|
| Codex | `.codex/config.toml`, `.codex/agents/*.toml`, `.agents/skills/squad-*/SKILL.md`, bloco idempotente em `AGENTS.md`, `.workflow/` |
| Claude | `.claude/agents/*.md`, `.claude/skills/squad-*/SKILL.md`, merge de `.claude/settings.json`, bloco em `CLAUDE.md`, `.workflow/` |
| OpenCode | `.opencode/agents/*.md`, `.opencode/commands/squad-*.md`, merge de `opencode.json`, `AGENTS.md`, `.workflow/` |
| Devin | `.devin/agents/*/AGENT.md`, `.agents/skills/squad-*/SKILL.md`, bloco em `AGENTS.md` sem substituí-lo, `.workflow/` |

### 4.3 Papéis LLM e gates

Manter 13 papéis como conceitos, mas não como 13 sessões LLM.

| Papel atual | Estado alvo |
|---|---|
| planner | workflow/skill na sessão principal |
| product-manager | subagente; perguntas ao usuário passam por checkpoint do root |
| requirements-reviewer | subagente read-only; um retorno antes de checkpoint humano |
| tech-analyst | subagente premium sob demanda |
| doc-writer | subagente econômico, derivando artefatos aprovados |
| issue-creator | alias de compatibilidade para o gate `work-item-publisher`, com adapters GitHub/Jira/nenhum |
| implementer | subagente com tarefa e arquivos delimitados |
| sre | subagente sob demanda; paralelo só com escopo disjunto |
| reviewer | subagente read-only e independente, depois dos gates básicos |
| linter | gate determinístico; retirar do caminho LLM |
| tester | dividir em `test-author` LLM e `test-runner` determinístico |
| bug-triager | subagente sob demanda |
| finisher | Git/PR por scripts; redação econômica opcional para notas |

Os 13 nomes acima são papéis conceituais e pontos de entrada compatíveis. Isso não obriga 13 subagentes LLM: `linter`, `issue-creator`, `test-runner` e a parte mecânica de `finisher` tornam-se gates/scripts.

Nos seletores de subagentes, expor somente especialistas que realmente iniciam sessões LLM. Papéis determinísticos mantêm seus aliases em comandos, estado, handoffs e logs para compatibilidade, mas não aparecem como agentes invocáveis.

### 4.4 Compatibilidade mínima

Política: em cada release da squad, testar a versão estável corrente e a linha minor imediatamente anterior. O `doctor` reprova versão abaixo do piso e usa capability probes para recursos experimentais.

| Runtime | Estável observada em 19/07/2026 | Piso inicial | Observação |
|---|---:|---:|---|
| Codex CLI | 0.144.6 | 0.143.0 | Luna confirmada na conta alvo; manter gate para outras contas |
| Claude Code | 2.1.215 | 2.0.0 | Haiku confirmada na conta alvo; validar formato de subagente |
| OpenCode | 1.18.3 | 1.17.0 | validar agents, commands e schema de configuração |
| Devin CLI | canal estável atual | estável anterior | histórico SemVer público insuficiente; resolver por `--version` e probes de custom agents/SWE-1.7 |
| VS Code | 1.129.1 | 1.128.0 | target secundário, mas gerado e testado pela mesma fonte |

Esses pisos são recalculados em cada major/minor da squad, não ficam congelados indefinidamente.

### 4.5 Work items opcionais

O workflow sempre produz primeiro um artefato local validado. A publicação externa é um adapter retomável, nunca condição para planejar ou implementar.

```yaml
# .squad/config.yaml
work_items:
  provider: none       # none | github | jira
  publish: manual      # manual | after-plan
  project: null        # repo GitHub ou project key Jira
  require_confirmation: true
```

- `github`: usa `gh` ou MCP/skill equivalente;
- `jira`: usa MCP/CLI configurado pelo projeto e credenciais externas ao repositório;
- `none`: preserva stories/tasks em `.workflow/` sem publicar;
- `AGENTS.md`: pode exigir ou proibir publicação e indicar o provider esperado, mas `.squad/config.yaml` é a configuração operacional;
- novos trackers implementam a mesma interface `validate`, `publish`, `update` e `link` sem alterar os agentes.

## 5. Modelos e escalonamento

### 5.1 Classes portáveis

- `deterministic`: sem LLM;
- `economy`: transformação estruturada e documentação derivada;
- `standard`: requisitos delimitados, implementação normal e criação de testes;
- `premium`: arquitetura ambígua, segurança, produção, migração, debugging e revisão crítica.

O renderer resolve classe para modelo disponível. IDs devem ser validados na instalação e novamente em runtime; fallback não deve ser inventado. Luna e Haiku seguem a mesma semântica de gate: usar no tier `economy` apenas quando o seletor da conta expuser o modelo; caso contrário, promover para Terra ou Sonnet com esforço reduzido.

### 5.2 Mapeamento equilibrado

| Papel | Classe | Codex, conforme relatório | Claude | OpenCode Go | Devin |
|---|---|---|---|---|---|
| orquestração/PM | standard | Terra | Sonnet | Qwen3.7 Plus | SWE-1.7, se disponível |
| requirements-reviewer | standard → premium | Terra → Sol | Sonnet → Opus | DeepSeek V4 Pro | SWE-1.7 |
| tech-analyst | premium | Sol | Opus | GLM-5.2 | SWE-1.7; modelo principal forte após gate |
| doc-writer | economy | Luna, se disponível | Haiku, se disponível | DeepSeek V4 Flash ou MiMo-V2.5 | SWE-1.6 |
| implementer | standard → premium | Terra → Sol | Sonnet → Opus | Kimi K2.7 Code → GLM-5.2 | SWE-1.7; modelo principal forte após gate |
| sre | premium sob demanda | Sol | Opus | GLM-5.2 | SWE-1.7; modelo principal forte após gate |
| reviewer | premium | Sol | Sonnet → Opus crítico | DeepSeek V4 Pro → GLM-5.2 | SWE-1.7 read-only |
| test-author | standard | Terra | Sonnet | Kimi K2.7 Code | SWE-1.7 |
| bug-triager | standard → premium | Terra → Sol | Sonnet → Opus | DeepSeek V4 Pro → GLM-5.2 | SWE-1.6 → SWE-1.7 |
| release notes | economy | Luna, se disponível | Haiku, se disponível | DeepSeek V4 Flash ou MiMo-V2.5 | SWE-1.6 |

O relatório usa Sol, Terra e Luna. A página oficial de modelos do Codex documenta `gpt-5.6-luna`, embora a página específica de subagentes não o cite. Portanto, Luna não é um ID presumido, mas continua sujeito ao gate de disponibilidade da conta. Claude usa aliases suportados (`sonnet`, `opus`, `haiku`) e aplica a Haiku o mesmo gate de Luna.

No OpenCode Go, Kimi K2.6 e K2.7 Code têm o mesmo preço publicado: US$ 0,95/M de entrada e US$ 4,00/M de saída. K2.6 pode continuar como opção especializada em documentação/contexto longo, mas não como tier econômico. Para `economy`, usar DeepSeek V4 Flash ou MiMo-V2.5; para código, preferir K2.7 Code, que é otimizado para coding.

No Devin CLI, usar modelos da Cognition: SWE-1.6 para exploração, documentação derivada e tarefas simples; SWE-1.7 para escrita de código, testes, revisão e análise. O instalador deve descobrir os nomes exatos oferecidos por `/model` antes de preencher `model:` nos perfis. Se SWE-1.7 não estiver disponível, usar o alias `swe` ou o modelo principal conforme a política. Não rotular esses subagentes como “gratuitos”: podem não ter sobretaxa premium na conta, mas cada subagente mantém contexto e consumo próprios e usa cota/créditos independentemente do pai.

### 5.3 Política operacional

Promover `standard → premium` se houver mais de oito arquivos, migração/schema, segurança, autenticação/autorização, concorrência, produção, bug sem reprodução, arquitetura ambígua, duas falhas verificáveis ou revisão crítica.

Reduzir quando ADR/plano já estiver aprovado, patch for localizado e testado, saída tiver schema rígido ou tarefa for documentação derivada.

Limites:

- máximo de dois ciclos de revisão;
- um premium simultâneo em Codex Plus e Claude Pro;
- até dois premium em OpenCode Go, respeitando orçamento;
- no Devin, preferir `subagent_explore`/SWE-1.6 para leitura e limitar fan-out, pois cada filho consome cota própria;
- reserva de 20% no Codex/OpenCode e 25% no Claude;
- acima de 75%, suspender docs opcionais e revisão redundante;
- PM e reviewer de requisitos fazem um retorno; depois, checkpoint humano.

## 6. Orquestração e estado

### 6.1 Máquina de estados

```text
initialized
  -> requirements
  -> requirements_review
  -> design
  -> planned
  -> implementation
  -> deterministic_checks
  -> review
  -> test_authoring (quando necessário)
  -> verification
  -> ready_to_finish
  -> complete

qualquer etapa -> blocked
falha corrigível -> implementation, respeitando max_cycles
```

### 6.2 Estrutura de `.workflow/`

```text
.workflow/
  config.yaml
  active-run
  runs/<run-id>/
    state.json
    handoff.md
    requirements.md
    plan.md
    tasks.json
    decisions.md
    checks.json
    review.md
    test-results.json
    release-notes.md
    events.jsonl
```

`state.json` deve registrar:

- `schema_version`, `run_id`, workflow, status, fase e próxima ação;
- epic/story/task/issue atuais;
- agente, classe/modelo e tentativas;
- arquivos reservados por worker;
- artefatos e hashes opcionais;
- comandos de verificação, códigos de saída e timestamp;
- consumo estimado/medido e modo de orçamento;
- decisões, perguntas abertas, ciclo atual e máximo.

Toda transição deve ler e validar o estado, registrar resultado estruturado, atualizar `handoff.md` e `state.json` atomicamente, anexar evento a `events.jsonl` e devolver ao root apenas resumo, evidências e próxima ação.

### 6.3 Handoff obrigatório

- cada agente usa `find-skills` no início quando houver domínio a descobrir;
- antes de terminar, usa o workflow de handoff e grava status, decisões, arquivos, comandos/resultados e perguntas;
- o root relê o estado em disco depois de cada filho;
- transição sem artefato obrigatório falha no validator;
- chat nunca é fonte canônica.

## 7. Paralelismo seguro

Aplicar ondas, como o GSD, somente a tarefas independentes.

Pode paralelizar leitura: exploração, documentação, análise de requisitos, revisão por dimensões, suítes independentes, triagem e sumarização.

Escrita paralela exige:

- `depends_on` e `write_scope` sem interseção;
- implementer e SRE em conjuntos de arquivos diferentes;
- worktree/branch isolado quando disponível;
- integração serial posterior com diff e gates completos.

Caso contrário, serializar. Começar com `max_threads = 4` no Codex e no máximo dois writers, embora o default documentado seja seis threads.

## 8. Comandos no estilo GSD

### 8.1 Catálogo mínimo

| Comando | Objetivo |
|---|---|
| `squad-init` | descobrir objetivo, stack, comandos e políticas; inicializar configuração e workflow |
| `squad-onboard` | mapear repositório existente e convenções |
| `squad-feature` | refinar e executar feature/epic |
| `squad-plan` | requisitos, arquitetura e plano sem implementar |
| `squad-execute` | executar plano aprovado por ondas |
| `squad-review` | gates prévios e revisão independente |
| `squad-test` | criar testes faltantes e executar gates |
| `squad-debug` | triagem persistente; `--diagnose` não corrige |
| `squad-fast` | mudança trivial inline, sem subagente |
| `squad-next` | inferir próxima ação de `state.json` |
| `squad-status` | mostrar estado, bloqueios, orçamento e evidências |
| `squad-resume` | retomar run interrompida |
| `squad-finish` | verificar gates e preparar commit/PR/release |

Flags comuns: `--auto`, `--from`, `--to`, `--only`, `--economy`, `--balanced`, `--quality`, `--max-cycles`, `--parallel`, `--dry-run`, `--diagnose`, `--no-issues` e `--no-pr`.

### 8.2 Bootstrap do projeto

`squad-init` é obrigatório na primeira execução da squad em cada projeto:

1. inspeciona, sem escrever, `AGENTS.md`, `CLAUDE.md`, README, manifests, lockfiles, CI, containers, IaC e configurações de ferramentas;
2. infere objetivo existente, linguagens, frameworks, package managers, comandos de lint/format/typecheck/build/test, cloud, banco e tracker, sempre registrando a evidência;
3. classifica cada descoberta como confirmada, provável ou desconhecida;
4. chama planner/product-manager com o skill `grill-me` somente para decisões não respondidas pelo repositório, uma pergunta por vez e com recomendação;
5. apresenta o resumo e o diff proposto antes de escrever;
6. grava `.squad/config.yaml`, inicializa `.workflow/` e cria ou atualiza apenas um bloco gerenciado em `AGENTS.md`;
7. preserva integralmente instruções preexistentes e mantém detalhes estruturados em `.squad/config.yaml`, sem duplicá-los no `AGENTS.md`;
8. em greenfield, começa pelo objetivo do projeto e só então propõe stack e comandos; em brownfield, prefere convenções já existentes.
9. apresenta os comandos detectados de lint, format, tipos, build e testes, executando somente os aprovados pelo usuário;
10. grava comandos, versões, exit codes e falhas preexistentes em `.workflow/baseline.json`; baseline com falhas não bloqueia o init, mas diferencia dívida existente de regressão posterior.

O resultado inclui comandos reais por projeto. A squad não presume Python, Node, Terraform, banco, cloud, framework ou linter e não instala dependências de aplicação sem decisão explícita.

### 8.3 Invocação por runtime

| Runtime | UX | Implementação |
|---|---|---|
| Codex | `$squad-feature <descrição>` ou pedido natural para usar o skill | `.agents/skills/squad-feature/SKILL.md`; root cria filhos `.codex/agents/*` |
| Claude | `/squad-feature <descrição>` | `.claude/skills/squad-feature/SKILL.md`; skill inline usa `Agent` |
| OpenCode | `/squad-feature <descrição>` | `.opencode/commands/squad-feature.md`, agente primário `planner` |
| Devin | `/squad-feature` quando skill slash estiver disponível; fallback `@skills:squad-feature` | `.agents/skills/`; especialistas em `.devin/agents/` |

Nomes e argumentos devem ser idênticos; só o prefixo muda. Não depender de custom slash command organizacional do Devin, pois exige administração.

### 8.4 Padrões aproveitados do GSD

- sessão principal leve e trabalho pesado em contexto fresco;
- ciclo discutir → planejar → executar → verificar → finalizar;
- planos que caibam em uma janela fresca;
- ondas baseadas em dependências;
- estado retomável;
- comandos separados para quick, debug, status, next e resume;
- checkpoints humanos para ambiguidade e ações externas;
- convergência limitada para impedir loops.

## 9. Plano de implementação

### Fase 0 — baseline e contratos

Entregas:

- congelar exemplos atuais como fixtures;
- criar ADR sobre fonte canônica e renderers;
- definir schemas de agent, workflow, state, handoff e result;
- registrar comandos reais de lint/test/build;
- definir versões mínimas dos runtimes.

Aceite: schemas validam fixtures positivas e rejeitam inválidas.

### Fase 1 — núcleo e gates determinísticos

Entregas:

- criar `squad/agents`, `squad/workflows`, `squad/commands` e `squad/models.yaml`;
- converter linter, test runner, issue creation e Git/PR em scripts;
- criar `work-item-publisher` com providers `none`, `github` e `jira`, mantendo `issue-creator` como alias;
- separar `test-author` de `test-runner`;
- criar executor de gates com JSON estável;
- ampliar handoff e criar `state.json` versionado.

Aceite:

- tarefas determinísticas não invocam modelo;
- cada gate registra comando, exit code e resumo;
- CI detecta drift de artefato gerado.

### Fase 2 — Codex

Entregas:

- gerar `.codex/agents/*.toml` para especialistas;
- gerar `.codex/config.toml` com `max_threads = 4`, `max_depth = 1`;
- usar read-only em reviewers/analistas e workspace-write só em implementer/SRE;
- criar skills `squad-*` em `.agents/skills/`;
- adicionar `codex` e `all` aos instaladores;
- atualizar README, AGENTS.md e exemplos.

Aceite:

- Codex descobre os especialistas;
- `$squad-plan` cria filhos diretos sem alterar código;
- `$squad-feature` completa uma fixture com handoffs e gates;
- reviewer não edita e implementer só escreve no workspace;
- nenhum fluxo depende de planner-filho criar netos.

### Fase 3 — Claude e OpenCode

Entregas:

- regenerar `.claude/agents` com allowlists `Agent(tipo)`;
- reservar Opus para escalonamento e aplicar a Haiku o mesmo gate de disponibilidade de Luna;
- criar `.claude/skills/squad-*`;
- atualizar modelos OpenCode segundo o relatório e a tabela vigente do Models.dev;
- classificar Kimi K2.6 como especializado em documentação, não como econômico; usar Flash/MiMo no tier `economy`;
- criar `.opencode/commands/squad-*`;
- retirar agentes mecânicos do caminho padrão.

Aceite:

- comandos plan, execute, review e debug funcionam em ambos;
- permissões read-only/write são testadas;
- modelos correspondem a `squad/models.yaml`;
- promoção ocorre conforme política, sem loop.

### Fase 4 — Devin

Entregas:

- criar `.devin/agents/<nome>/AGENT.md` e remover dependência de `subagent: true` em skills;
- manter `.agents/skills/squad-*` para comandos;
- descobrir os seletores disponíveis e gerar perfis com SWE-1.6 para tarefas simples/read-only e SWE-1.7 para código e análise;
- aplicar fallback de SWE-1.7 para `swe`/modelo principal quando o gate falhar, sem prometer custo zero;
- usar foreground para ações que podem pedir aprovação e background apenas com ferramentas pré-aprovadas;
- substituir a troca destrutiva de `AGENTS.md` por bloco gerenciado idempotente;
- aposentar conversores antigos ou fazê-los gerar `AGENT.md`.

Aceite:

- Devin lista e seleciona perfil customizado por nome;
- `/squad-feature` ou `@skills:squad-feature` inicia o fluxo;
- falta de permissão em background é clara e retomável em foreground;
- perfis pinados exibem SWE-1.6/SWE-1.7 quando disponíveis e o fallback é testado;
- instruções preexistentes do projeto são preservadas.

### Fase 5 — pacote npm/npx e instalador idempotente

Entregas:

- publicar o pacote npm multiplataforma `@gregori/orchestrated-squad`, com executável `squad`;
- oferecer a entrada conveniente `npx @gregori/orchestrated-squad@latest`, que abre o instalador interativo no diretório atual, nos moldes do GSD;
- após a instalação interativa, executar `squad-init` automaticamente; `--no-init` instala apenas os artefatos e `update` nunca reinicia a entrevista;
- suportar uso não interativo e reproduzível: `npx @gregori/orchestrated-squad@<versão> install --target codex|claude|opencode|devin|vscode|all`;
- expor também `update`, `uninstall`, `doctor`, `list` e `--version` pelo mesmo binário;
- empacotar fonte canônica, renderers, templates, schemas e manifesto de versão no tarball npm; não baixar arquivos arbitrários durante a instalação;
- não realizar escrita em `postinstall`: mudanças no projeto só começam após comando explícito e confirmação ou `--yes`;
- `--target codex|claude|opencode|devin|vscode|all`;
- fazer `--target all` instalar todos os targets, sem seleção parcial posterior;
- `--dry-run`, manifesto de arquivos e versão;
- merge estrutural de JSON/TOML, em vez de apenas pular existente;
- blocos delimitados para `AGENTS.md` e `CLAUDE.md`;
- backup somente quando merge não for possível;
- update e uninstall pelo manifesto;
- manter `install.sh` e `install.ps1` como wrappers finos do mesmo núcleo durante a transição, sem lógica divergente;
- automatizar release no npm a partir de tag Git, com versão SemVer, provenance, changelog e teste do tarball produzido por `npm pack`;
- preservar VS Code, embora não seja foco da otimização.
- declarar `engines.node` como `^22 || ^24`; `doctor` aceita Node 22/24 LTS, rejeita linhas EOL/ímpares e recomenda patch atualizado sem bloquear 24.1.0.

Aceite:

- `npx @gregori/orchestrated-squad@latest` instala interativamente em projeto vazio no Windows, Linux e macOS;
- a instalação padrão termina com `.squad/config.yaml`, `.workflow/` e bloco gerenciado de `AGENTS.md`; `--no-init` não cria esses artefatos de projeto;
- uma versão pinada produz a mesma árvore em execuções equivalentes;
- `npx ... doctor` detecta Node/runtime incompatível, target ausente, modelos indisponíveis e configuração inválida sem alterar arquivos;
- o pacote funciona sem instalação global e nunca modifica diretórios fora do projeto escolhido;
- o conteúdo instalado provém integralmente do tarball publicado e corresponde ao manifesto/checksum da release;
- instalar duas vezes não gera diff;
- dry-run não escreve;
- update preserva configuração do usuário;
- uninstall remove apenas itens do manifesto;
- PowerShell, Bash e npx produzem árvores equivalentes;
- CI instala a squad a partir do tarball empacotado, não diretamente da árvore fonte.

### Fase 6 — E2E e rollout

Entregas:

- manter fixtures internas executáveis em `tests/fixtures`: Python como referência forte de backend, TypeScript para pacote npx/aplicação secundária e Terraform para SRE;
- deixar explícito que fixtures validam a squad e nunca são copiadas como arquitetura padrão para o projeto instalado;
- executar os cenários funcionais relevantes na fixture Python sem tornar Python requisito da squad;
- incluir na fixture Python `.vscode/extensions.json` recomendando `ms-python.python` e `ms-python.vscode-pylance`;
- usar Pyright como type checker headless (`uv run pyright`) e Pylance como experiência no VS Code, compartilhando a mesma configuração versionada;
- configurar Pylance para o ambiente `uv`, análise do workspace e o mesmo modo de type checking do Pyright;
- aplicar Pyright/Pylance `strict` nas fixtures greenfield e `standard` na brownfield, permitindo adoção gradual sem enfraquecer o padrão para código novo;
- separar persistência em teste rápido SQLite e perfis de integração `postgres`, `mysql` e `mariadb` executados em containers;
- padronizar a camada de persistência em SQLAlchemy 2 e migrations em Alembic, sem SQL específico de um fornecedor no domínio;
- usar FastAPI e SQLAlchemy `AsyncSession` no runtime da aplicação, mantendo Alembic síncrono para migrations previsíveis entre os dialetos;
- incluir autenticação JWT local e autorização por papéis na fixture, sem IdP externo obrigatório; adapters Entra ID/Auth0/Cognito ficam opcionais;
- escolher o perfil de integração por `.squad/config.yaml` ou por detecção da infraestrutura declarada; configuração explícita sempre vence e o `doctor` mostra a decisão;
- executar PostgreSQL na validação padrão e cobrir MySQL/MariaDB na matriz de release, sem exigir Docker para lint, tipos ou testes unitários;
- fixtures `greenfield`, `brownfield`, `bug`, `infra` e `near-budget`;
- adicionar fixtures de descoberta para projetos Python, Node, polyglot e stack desconhecida, validando as perguntas produzidas pelo `squad-init`;
- smoke tests por runtime;
- retomada após interrupção e troca de runtime;
- teste de conflito entre writers;
- telemetria local sem conteúdo sensível;
- telemetria local por padrão e sem upload automático: duração, runtime/versão, papel, classe/modelo, tokens/custo quando expostos, resultado de gates e status; nunca prompts, diffs, conteúdo de arquivos, secrets ou caminhos absolutos;
- retenção recomendada de 30 dias para eventos, agregados mensais sem conteúdo e comandos `squad telemetry export|purge|disable`;
- oferecer `squad telemetry contribute` como opt-in manual: agregar no mínimo cinco runs, sanitizar e mostrar o payload completo antes de qualquer ação externa;
- permitir `--output <arquivo>` sem envio ou, após confirmação, abrir PR em repositório dedicado como `gregori/orchestrated-squad-metrics`;
- manter `gregori/orchestrated-squad-metrics` público, com validação automática de schema e política de rejeição para payload potencialmente identificável;
- licenciar ferramentas e schemas do repositório de métricas sob MIT e relatórios agregados sob CC0 1.0; mostrar os termos antes de criar o PR;
- gerar no corpo do PR uma declaração de autorização, revisão da sanitização, ausência de dados confidenciais e aceite de CC0 1.0; CI rejeita contribuição sem todas as confirmações, sem exigir CLA ou DCO;
- versionar o schema dos relatórios e remover repo, usuário, paths, branches, prompts, diffs, secrets e timestamps precisos; avisar que a identidade GitHub do autor do PR será pública;
- proibir upload automático/periódico; considerar endpoint dedicado somente se o volume tornar PRs inadequados, preservando schema e consentimento;
- piloto de 5–10 fluxos para recalibrar custo.

Aceite:

- os quatro runtimes passam a matriz da seção 10;
- VS Code abre a fixture Python com Pylance ativo, ambiente `uv` resolvido e sem diagnósticos inesperados;
- Pyright em CLI e Pylance no editor não produzem políticas de tipos divergentes;
- migrations e suíte de integração passam no banco selecionado para o recurso cloud alvo;
- instalar ou inicializar a squad não adiciona FastAPI, SQLAlchemy, Pylance, Terraform ou qualquer dependência da fixture ao projeto alvo;
- `squad-init` detecta comandos existentes e entrevista apenas lacunas, preservando o restante do `AGENTS.md`;
- nenhum comando do projeto é executado silenciosamente; baseline só roda após confirmação explícita;
- nenhuma fixture excede dois ciclos;
- outro runtime retoma pelo mesmo `.workflow/`;
- métricas separam LLM de gates determinísticos.

## 10. Matriz de validação

Executar os mesmos cenários nos quatro runtimes:

| ID | Cenário | Evidência obrigatória |
|---|---|---|
| S01 | descoberta de especialistas | nomes e configurações carregadas |
| S02 | somente planejamento | requisitos, review, ADR/plan e nenhum código alterado |
| S03 | feature simples | diff mínimo, unit test, gates, review e estado completo |
| S04 | infra + código | escopos disjuntos/worktrees e integração serial |
| S05 | bug `--diagnose` | hipótese, evidência, causa e nenhum arquivo alterado |
| S06 | lint falha | retorno ao implementer sem linter LLM |
| S07 | teste existente falha | resultado estruturado e triagem apenas se necessária |
| S08 | segurança/migração | promoção para premium e review independente |
| S09 | limite de ciclos | bloqueio/checkpoint, sem loop |
| S10 | retomada cross-runtime | continuação pelo mesmo `state.json` |
| S11 | permissão negada | erro legível, status `blocked`, sem ação silenciosa |
| S12 | orçamento >75% | docs/review opcional suspensos |
| S13 | instalação idempotente | segunda execução sem diff |
| S14 | preservação do alvo | configs e instruções preexistentes intactas |
| S15 | instalação npx | install/update/doctor/uninstall idempotentes em projeto vazio e existente |

Validação específica:

- **Codex:** TOML, descoberta, profundidade, sandbox e skills;
- **Claude:** `/agents`/diagnóstico, `Agent(tipo)`, tools e skills;
- **OpenCode:** schema/config, agente primário, filhos e commands;
- **Devin:** `AGENT.md`, perfil explícito, foreground/background e slash/@mention.

## 11. Segurança e ações externas

- reviewers, requirements-reviewer e tech-analyst são read-only;
- criação de issue/PR, push, tag e release exigem comando explícito ou checkpoint;
- scripts validam owner, repo e branch antes de mutar GitHub;
- background não recebe permissão nova implicitamente;
- instalador não sobrescreve config sem merge, backup ou `--force`;
- secrets não entram em handoff, logs ou prompts;
- `find-skills` pesquisa, mas não instala automaticamente;
- pacote sugerido por LLM passa por verificação de existência e reputação;
- ação destrutiva fica fora do fluxo automático.

## 12. Métricas

Medir por run/runtime:

- percentual de etapas sem LLM;
- chamadas e tempo por classe de modelo;
- taxa e motivo de promoção premium;
- tokens/custo quando disponível;
- ciclos de review e retrabalho;
- tempo até implementação verificada;
- conflitos e retomadas;
- runs concluídas sem intervenção;
- violações de schema/permissão;
- drift entre fonte e adaptadores.

## 13. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| formato experimental muda | pin de versão mínima, fixtures e renderer isolado |
| modelo não está disponível | resolver por classe, detectar e falhar claramente |
| planner-filho não delega no Codex | workflow no root; profundidade 1 e filhos diretos |
| writers alteram mesmos arquivos | dependency graph, `write_scope`, worktrees e integração serial |
| filho precisa entrevistar usuário | root faz checkpoint; PM devolve perguntas estruturadas |
| contexto repetido entre papéis | menos workers LLM, sessões frescas e handoffs curtos |
| instalador danifica configuração | merge, dry-run, manifesto, blocos e testes idempotentes |
| pacote npm comprometido ou divergente | provenance, 2FA/token OIDC, dependências mínimas, lockfile, `npm pack` em CI e release por tag protegida |
| `@latest` muda o resultado | documentar pin de versão para CI e registrar versão no manifesto instalado |
| contribuição de métricas reidentifica projeto/autor | agregação mínima, sanitização, preview obrigatório, consentimento explícito e aviso de identidade pública em PR |
| GitHub não autenticado | `--no-issues/--no-pr` e bloqueio recuperável |
| tracker não disponível | provider `none`, artefato local preservado e publicação retomável depois |
| skill/pacote malicioso | descoberta sem auto-install e gate humano |
| comandos divergem | nomes/flags canônicos; só o prefixo é adaptado |

## 14. Decisões

1. A sessão principal controla o workflow.
2. Especialistas têm escopo e permissões explícitos.
3. `.workflow/` é portátil entre runtimes.
4. Modelo é escolhido por classe e resolvido por plataforma.
5. Gates determinísticos precedem review LLM.
6. Paralelismo de writers depende do grafo, não é padrão.
7. Comandos são skills/templates versionados, sem dependência organizacional.
8. Fonte canônica gera adaptadores e CI bloqueia drift.
9. Devin usa custom agents; skills ficam com procedimentos.
10. VS Code é preservado, mas não é foco.
11. O canal recomendado de instalação é `npx`; scripts de shell tornam-se compatibilidade e usam o mesmo núcleo.
12. O pacote não usa `postinstall` para modificar o projeto.
13. `--target all` instala todos os targets suportados.
14. Work items são opcionais e usam provider configurável; GitHub não é obrigatório.
15. VS Code migra agora para a fonte canônica, evitando uma quinta cópia manual dos agentes.
16. Luna, Haiku e SWE-1.7 estão disponíveis na conta de referência; gates continuam para portabilidade.
17. A instalação interativa chama `squad-init`; `--no-init` é opt-out e updates não repetem o bootstrap.
18. Seletores exibem apenas agentes LLM; gates preservam os nomes conceituais somente no workflow e na observabilidade.
19. Telemetria é local; contribuição upstream é manual, agregada, sanitizada e revisada antes de arquivo ou PR.
20. O repositório opcional de métricas agregadas é público; dados não publicáveis permanecem somente locais.
21. Código e schemas de métricas usam MIT; relatórios contribuídos usam CC0 1.0.
22. Consentimento de métricas usa declaração explícita no PR validada por CI, sem CLA/DCO.

## 15. Questões abertas

- Nenhuma nesta revisão; novas questões devem ser registradas com contexto, recomendação e responsável.

## 16. Fontes consultadas

- [Relatório local de otimização](../relatorio_otimizacao_coding_agents.md)
- [Codex — Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents?surface=app)
- [Codex — Models](https://learn.chatgpt.com/docs/models?surface=app)
- [Claude Code — Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code — Skills e commands](https://code.claude.com/docs/en/slash-commands)
- [OpenCode — Agents](https://opencode.ai/docs/agents/)
- [OpenCode — Commands](https://opencode.ai/docs/commands/)
- [Models.dev — OpenCode Go](https://models.dev/providers/opencode-go/)
- [Kimi K2.7 Code](https://www.kimi.com/resources/kimi-k2-7-code)
- [Devin CLI — Subagents](https://docs.devin.ai/cli/subagents)
- [Devin CLI — Models](https://docs.devin.ai/cli/models)
- [Codex CLI — Releases](https://github.com/openai/codex/releases)
- [Claude Code — Releases](https://github.com/anthropics/claude-code/releases)
- [OpenCode — Releases](https://github.com/anomalyco/opencode/releases)
- [Node.js — Release schedule](https://nodejs.org/en/about/previous-releases)
- [VS Code — Release archive](https://code.visualstudio.com/updates/archive)
- [Pylance — Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance)
- [Pyright — Static Type Checker for Python](https://github.com/microsoft/pyright)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Alembic](https://alembic.sqlalchemy.org/en/latest/)
- [Devin — Skills](https://docs.devin.ai/product-guides/skills)
- [GSD Core](https://github.com/open-gsd/gsd-core)
- [GSD Core — Commands](https://github.com/open-gsd/gsd-core/blob/next/docs/COMMANDS.md)
