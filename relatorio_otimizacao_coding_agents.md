# Otimização de modelos por agente: Codex, Claude Code e OpenCode Go

**Data de corte:** 12 de julho de 2026  
**Escopo:** assinaturas individuais ChatGPT Plus, Claude Pro e OpenCode Go padrão.  
**Objetivo:** otimizar cada assinatura independentemente para uma squad agêntica de engenharia de software com aproximadamente 13 agentes, sem eleger vencedor geral.

> **Arquivo histórico:** este relatório preserva a pesquisa de 12 de julho de
> 2026. Não use seus IDs de modelo, preços, limites ou disponibilidade como
> configuração de runtime. A política operacional atual está em
> `squad/models.yaml`; confirme catálogos e versões no runtime com `squad doctor`.

> **Nota de confiabilidade:** preços, modelos e limites explicitamente publicados são tratados como fatos. Volume mensal de features, stories e epics é necessariamente uma estimativa, porque OpenAI e Anthropic não publicam uma franquia mensal fixa equivalente a tokens ou dólares para esses planos. Nesses casos, são apresentados intervalos conservador, provável e otimista.

---

## 1. Resumo executivo

### Codex com ChatGPT Plus

A estratégia cotidiana mais eficiente é reservar **GPT-5.6 Sol** para arquitetura, debugging difícil, implementação multiarquivo e revisão crítica; usar **GPT-5.6 Terra** como padrão para planejamento, requisitos, implementação normal e testes novos; e usar **GPT-5.6 Luna** para documentação derivada, triagem simples, criação de issues e transformações estruturadas. Lint, formatação, execução de testes, commits e coleta de resultados devem ser determinísticos.

A assinatura custa **US$ 20/mês**. A documentação atual indica aproximadamente **15–90 mensagens locais por janela de 5 horas com Sol, 20–110 com Terra e 50–280 com Luna**, com uma franquia compartilhada entre mensagens locais e tarefas em nuvem e possíveis limites semanais adicionais. Como o limite semanal não é divulgado, a capacidade mensal não pode ser calculada com precisão.

**Configuração equilibrada estimada:** 5–10 epics de três stories por mês, com grande variação conforme tamanho do repositório, quantidade de ferramentas e retrabalho.

### Claude Code com Claude Pro

A configuração mais eficiente usa **Claude Sonnet 5** como padrão geral. **Claude Opus 4.8** deve ser reservado para decisões de alto impacto: arquitetura ambígua, bugs difíceis, segurança, migrações e revisão final de mudanças críticas. **Haiku**, quando disponível no seletor da conta e do Claude Code, serve para documentação simples, classificação e tarefas mecânicas; caso contrário, use Sonnet com escopo e esforço reduzidos ou scripts.

O plano custa **US$ 20/mês**, ou US$ 200/ano. O uso é compartilhado entre Claude e Claude Code, reinicia por janela de cinco horas e também possui limite semanal. A Anthropic não divulga um número fixo de mensagens ou tokens para Pro; o consumo depende do contexto, modelo, tamanho do repositório e uso de ferramentas.

**Configuração equilibrada estimada:** 3–7 epics de três stories por mês. O uso do Claude web fora do coding reduz diretamente essa capacidade.

### OpenCode Go

OpenCode Go oferece a forma mais mensurável de otimização: custa **US$ 10/mês** após o primeiro mês promocional de US$ 5 e inclui limites expressos em valor de uso: **US$ 12 por 5 horas, US$ 30 por semana e US$ 60 por mês**. Os modelos são selecionáveis por agente e a lista publicada inclui GLM-5.2, GLM-5.1, Kimi K2.7 Code, Kimi K2.6, MiMo-V2.5, MiMo-V2.5-Pro, MiniMax M3/M2.7, Qwen3.7 Max/Plus, Qwen3.6 Plus e DeepSeek V4 Pro/Flash.

A configuração equilibrada recomendada usa **GLM-5.2** para arquitetura e implementação difícil, **Kimi K2.7 Code** para implementação cotidiana, **DeepSeek V4 Pro ou Qwen3.7 Plus** para planejamento, revisão e requisitos, e **DeepSeek V4 Flash ou MiMo-V2.5** para tarefas mecânicas. O uso determinístico continua obrigatório para lint, testes existentes, Git e CI.

**Configuração equilibrada estimada:** 6–8 epics de três stories por mês, assumindo US$ 7–10 de consumo efetivo por epic. A vantagem analítica é que o usuário consegue medir e ajustar a estimativa diretamente pelo painel de uso.

---

## 2. Metodologia e premissas

### 2.1 Unidade de trabalho

A unidade comparável principal é um **epic com três stories médias**.

Premissas do epic:

| Etapa | Invocações de agente | Observação |
|---|---:|---|
| Orquestração/planning | 4 | abertura do epic e três stories |
| Product manager | 4–5 | epic e refinamento das stories |
| Requirements reviewer | 4–5 | um ciclo máximo por item |
| Tech analyst/architect | 3 | uma por story |
| Documentation writer | 4–5 | PRD, ADRs e docs derivadas |
| Issue creator | 3 | uma por story |
| Implementer | 6 | duas tarefas relevantes por story |
| SRE | 0–2 | somente quando há infraestrutura |
| Reviewer | 6 | uma revisão por implementação |
| Tester — criação de testes | 4–6 | execução mecânica separada |
| Bug triager | 0–2 | acionado em falhas não triviais |
| Release finisher | 1 | entrega final |
| Linter/test executor/Git | determinístico | sem LLM |

Total típico: **39–52 invocações lógicas de LLM**, mas cada invocação pode gerar múltiplas chamadas internas ao modelo por causa de terminal, leitura de arquivos, ferramentas e autocorreção.

### 2.2 Contexto e repetição

- Pequena tarefa: 5–20 mil tokens relevantes.
- Bug médio: 20–80 mil tokens acumulados.
- Story média: 50–200 mil tokens acumulados ao longo do fluxo.
- Feature: 150–600 mil tokens acumulados.
- Epic de três stories: 400 mil–1,8 milhão de tokens lidos/processados, com forte benefício de cache e handoffs resumidos.
- Refação: 15% no cenário econômico, 25% no equilibrado e 35% no de qualidade máxima, pois este último permite mais revisão.
- Máximo recomendado: **dois ciclos de revisão**, contando o primeiro retorno. O repositório original já usa um ciclo padrão e proíbe loops infinitos.
- Paralelismo premium: um agente premium por vez no Plus/Pro; no Go, no máximo dois, desde que a janela de US$ 12 não esteja próxima do limite.
- Reserva: 20% da franquia para debugging, segurança e revisão final.

### 2.3 Classes de evidência

- **Fato:** publicado pelo fornecedor ou documentação oficial.
- **Inferência:** consequência operacional de fatos publicados.
- **Estimativa:** cálculo com premissas explícitas.
- **Não divulgado:** fornecedor não publicou número verificável.

---

## 3. Planos e limites atuais

### 3.1 Codex — ChatGPT Plus

| Item | Situação em 12/07/2026 |
|---|---|
| Preço | US$ 20/mês, antes de impostos locais |
| Codex incluído | Sim: web, CLI, IDE, app e iOS |
| Modelos publicados para Plus | GPT-5.6 Sol, Terra e Luna; família GPT-5.6 |
| Seleção por tarefa/agente | Sim no CLI/configuração; a superfície pode variar |
| Limite de 5 h — Sol | 15–90 mensagens locais |
| Limite de 5 h — Terra | 20–110 mensagens locais |
| Limite de 5 h — Luna | 50–280 mensagens locais |
| Limite semanal | Pode existir; valor não divulgado |
| Limite mensal fixo | Não divulgado |
| Créditos adicionais | Disponíveis para Plus/Pro |
| API incluída | Não; uso com API key é cobrado separadamente |
| Fallback ao atingir limite | Trocar para modelo menor, comprar créditos ou usar API |
| Compartilhamento de franquia | Mensagens locais e tarefas em nuvem compartilham janela; outros recursos agênticos podem compartilhar uso |

**Leitura correta:** os intervalos não são garantias de produtividade. Uma mensagem longa com muitas ferramentas pode consumir muito mais que uma interação curta.

### 3.2 Claude Code — Claude Pro

| Item | Situação em 12/07/2026 |
|---|---|
| Preço | US$ 20/mês ou US$ 200/ano |
| Claude Code incluído | Sim |
| Modelo padrão atual | Claude Sonnet 5 |
| Modelo premium disponível | Claude Opus 4.8, sujeito a disponibilidade/limites da conta |
| Modelo econômico | Haiku, quando disponibilizado no seletor do plano/Claude Code |
| Seleção por agente | Sim por `/model`, flag, settings ou ambiente |
| Contexto | 200 mil tokens nos planos pagos, salvo alteração específica do modelo/superfície |
| Limite de 5 h | Existe; quantidade fixa não divulgada |
| Limite semanal | Existe; valor não divulgado |
| Limite semanal de Opus | Monitorado separadamente em alguns planos/superfícies |
| Uso compartilhado | Claude web, apps, IDE e Claude Code compartilham limites |
| Créditos adicionais | Podem ser habilitados; cobrados nas tarifas de API |
| API incluída | Não |
| Fast mode | Não incluído na franquia; usa créditos adicionais |

**Leitura correta:** Claude Pro não deve ser planejado como “Opus ilimitado”. Sonnet precisa ser o modelo de produção; Opus funciona como escalonamento excepcional.

### 3.3 OpenCode Go

| Item | Situação em 12/07/2026 |
|---|---|
| Preço | US$ 5 no primeiro mês; US$ 10/mês depois |
| Limite por 5 h | US$ 12 de uso |
| Limite semanal | US$ 30 de uso |
| Limite mensal | US$ 60 de uso |
| Seleção por agente | Sim, por configuração do agente/modelo |
| Uso após limite | Modelos gratuitos; opcionalmente saldo Zen pago |
| API | Endpoints Go disponíveis com a mesma chave/franquia |
| Workspace | Uma assinatura Go por workspace |
| Mudanças na lista | A lista pode mudar conforme testes do fornecedor |

Modelos publicados:

| Modelo | Input US$/MTok | Output US$/MTok | Perfil operacional |
|---|---:|---:|---|
| GLM-5.2 | 1,40 | 4,40 | premium de código/raciocínio |
| GLM-5.1 | 1,40 | 4,40 | fallback premium |
| Kimi K2.7 Code | 0,95 | 4,00 | implementação e terminal |
| Kimi K2.6 | 0,95 | 4,00 | documentação/contexto longo |
| MiMo-V2.5 | 0,14 | 0,28 | econômico de alto volume |
| MiMo-V2.5-Pro | 1,74 | 3,48 | raciocínio intermediário |
| MiniMax M3 | 0,30 | 1,20 | intermediário econômico |
| MiniMax M2.7 | 0,30 | 1,20 | tarefas estruturadas |
| Qwen3.7 Max | 2,50 | 7,50 | premium, caro na franquia |
| Qwen3.7 Plus ≤256K | 0,40 | 1,60 | planejamento/requisitos |
| Qwen3.6 Plus ≤256K | 0,50 | 3,00 | fallback de planejamento |
| DeepSeek V4 Pro | 1,74 | 3,48 | revisão e raciocínio |
| DeepSeek V4 Flash | 0,14 | 0,28 | econômico de alto volume |

---

## 4. Características da squad analisada

O repositório `gregori/orchestrated-squad` define 13 agentes, estado persistido em `.workflow/`, handoff obrigatório, planner puramente orquestrador e ciclo único de correção por padrão. Essas características são adequadas para planos de consumo limitado.

| Agente | Categoria | Frequência | Impacto de erro | Recomendação estrutural |
|---|---|---:|---:|---|
| planner | A | alta | alto | modelo forte/intermediário; contexto resumido |
| product manager | B | média | alto | intermediário |
| requirements reviewer | B/A | média | alto | modelo diferente do PM |
| tech analyst/architect | A | média | crítico | premium |
| documentation writer | B/C | média | baixo-médio | econômico/intermediário |
| issue creator | C | média | baixo | template/script ou econômico |
| implementer | A | muito alta | crítico | modelo forte; maior consumidor |
| SRE | B/A | baixa | crítico quando acionado | premium sob demanda |
| code reviewer | A | alta | crítico | forte e independente |
| linter | D | alta | baixo | determinístico |
| tester | B/D | alta | alto | LLM apenas para criar/investigar testes |
| bug triager | A/B | sob demanda | alto | forte em bugs difíceis |
| release finisher | B/C | baixa | médio | econômico + automação |

### Tarefas sem LLM

- lint e formatação;
- compilação;
- análise estática;
- execução de testes existentes;
- cobertura e coleta de logs;
- criação de branch;
- `git status`, `git diff`, commit e tag com template;
- criação de PR quando título/corpo derivam de artefatos já validados;
- atualização de labels;
- geração simples de changelog a partir de commits convencionais;
- verificação de secrets, dependências e SBOM;
- política de merge e gates de CI.

---

## 5. Evidências de benchmarks

Benchmarks devem ser usados como sinais de adequação, não como ranking global.

1. **SWE-bench Verified** está saturado e apresenta risco de contaminação. A própria OpenAI recomenda priorizar SWE-bench Pro para modelos de fronteira.
2. **SWE-bench Pro** contém tarefas longas e multiarquivo, mas resultados dependem fortemente do scaffold, conjunto público/privado e número de tentativas.
3. Resultados de modelos no harness do fornecedor não podem ser atribuídos exclusivamente ao modelo.
4. Para a distribuição proposta, o sinal mais importante é a consistência relativa:
   - modelos premium são mais adequados para arquitetura, debugging e edição multiarquivo;
   - modelos de código especializados são adequados para implementação e terminal;
   - modelos econômicos funcionam quando a saída é estruturada e verificável;
   - revisão independente deve usar modelo/família diferente quando possível.

### Nível de confiança por capacidade

| Capacidade | Melhor evidência utilizável | Confiança |
|---|---|---|
| implementação multiarquivo | SWE-bench Pro + relatos de repositório | média |
| correção de bugs | SWE-bench Pro/Verified com ressalvas | média |
| terminal/tool use | Terminal-Bench e avaliações de agente | média |
| planejamento/arquitetura | avaliações qualitativas e long-horizon | baixa-média |
| revisão e segurança | benchmarks ainda pouco padronizados | baixa |
| documentação | qualidade linguística + custo | média |
| velocidade | documentação de produto e experiência operacional | média |
| consumo | limites oficiais; tokens quando publicados | alta para Go, baixa-média para Plus/Pro |

---

## 6. Análise do Codex

### 6.1 Modelos

| Modelo | Assinatura | Selecionável | Contexto | Velocidade | Coding | Raciocínio | Tool use | Consumo relativo |
|---|---|---|---|---|---|---|---|---:|
| GPT-5.6 Sol | Plus | sim | não divulgado na página do plano | baixa-média | excelente | máximo | excelente | 1,00 |
| GPT-5.6 Terra | Plus | sim | não divulgado | média | muito bom | forte | muito bom | 0,75–0,85 |
| GPT-5.6 Luna | Plus | sim | não divulgado | alta | bom em tarefas delimitadas | moderado | bom | 0,25–0,40 |
| GPT-5.3-Codex-Spark | Pro apenas | não no Plus | — | muito alta | cotidiano | moderado | forte | fora do escopo |
| Modelos da API | API separada | não por assinatura | varia | varia | varia | varia | varia | cobrança separada |

### 6.2 Distribuição equilibrada

| Agente | Principal | Fallback | Categoria | Consumo | Prioridade |
|---|---|---|---|---:|---|
| planner | Terra | Luna | A | 5% | alta |
| product manager | Terra | Luna | B | 6% | média |
| requirements reviewer | Terra | Sol em ambiguidade | B/A | 6% | alta |
| tech analyst | Sol | Terra | A | 10% | crítica |
| doc writer | Luna | Terra | B/C | 4% | baixa |
| issue creator | script/Luna | template | C/D | 1% | baixa |
| implementer | Terra; Sol para complexas | Luna para patches simples | A | 33% | crítica |
| SRE | Sol | Terra | A/B | 5% | crítica quando acionado |
| reviewer | Sol | Terra | A | 17% | crítica |
| linter | determinístico | — | D | 0% | sem LLM |
| tester | Terra para novos testes | ferramentas | B/D | 8% | alta |
| bug triager | Sol | Terra | A | 3% | alta |
| finisher | Luna | Terra | C/B | 2% | média |

**Concentração estimada:** implementer + reviewer + tech analyst representam aproximadamente 60% do consumo.

### 6.3 Quatro configurações

| Configuração | Estratégia | Risco | Epics/mês estimados |
|---|---|---|---:|
| Econômica | Luna para quase tudo; Terra em implementação; Sol só após falha | baixo-médio | 8–18 |
| Equilibrada | Terra padrão; Sol em arquitetura/review/difícil; Luna mecânico | médio | 5–10 |
| Qualidade máxima | Sol em arquitetura, implementação e revisão; mais ciclos | alto | 2–5 |
| Próxima do limite | Luna + scripts; Sol reservado para blocker/review final | baixo até reset | 1–3 adicionais com capacidade residual |

Faixas são estimativas, não franquias oficiais.

### 6.4 Regras operacionais

- Não iniciar reviewer antes de lint, build e testes locais passarem.
- Não usar Sol para issue creator, changelog, commit ou resumo.
- Promover Terra → Sol após duas falhas verificáveis, alteração em mais de oito arquivos, migração, segurança, concorrência ou impacto de produção.
- Rebaixar Sol → Terra quando a arquitetura já estiver registrada em ADR.
- Rebaixar Terra → Luna em transformações derivadas com schema fixo.
- Evitar mais de um agente Sol em paralelo no Plus.
- Preservar 20% da semana para debugging e revisão final.
- Quando o uso passar de 75%, desabilitar documentação não essencial e revisão duplicada.

---

## 7. Análise do Claude Code

### 7.1 Modelos

| Modelo | Pro | Selecionável | Contexto | Velocidade | Coding | Raciocínio | Tool use | Consumo relativo |
|---|---|---|---:|---|---|---|---|---:|
| Claude Sonnet 5 | sim; padrão | sim | 200K no plano, salvo restrição específica | média-alta | excelente | forte | excelente | 0,55–0,70 |
| Claude Opus 4.8 | sim, sujeito a limites | sim | conforme superfície/modelo | baixa-média | excelente | máximo | excelente | 1,00 |
| Claude Haiku atual | depende da disponibilidade da conta | sim quando listado | conforme modelo | alta | adequado a tarefas simples | leve | bom | 0,15–0,30 |
| Fast mode | via créditos | sim | — | muito alta | excelente | máximo | excelente | fora da franquia |

### 7.2 Distribuição equilibrada

| Agente | Principal | Fallback | Categoria | Consumo | Prioridade |
|---|---|---|---|---:|---|
| planner | Sonnet 5 | Haiku/contexto reduzido | A | 5% | alta |
| product manager | Sonnet 5 | Haiku | B | 6% | média |
| requirements reviewer | Sonnet 5 | Opus 4.8 | B/A | 7% | alta |
| tech analyst | Opus 4.8 | Sonnet 5 high effort | A | 11% | crítica |
| doc writer | Haiku/Sonnet | script | B/C | 4% | baixa |
| issue creator | template/Haiku | script | C/D | 1% | baixa |
| implementer | Sonnet 5 | Opus 4.8 após falha | A | 35% | crítica |
| SRE | Opus 4.8 | Sonnet 5 | A/B | 5% | crítica |
| reviewer | Sonnet 5; Opus em crítico | Sonnet reduzido | A | 16% | crítica |
| linter | determinístico | — | D | 0% | sem LLM |
| tester | Sonnet 5 para criação | ferramentas | B/D | 8% | alta |
| bug triager | Opus em difícil | Sonnet | A/B | 3% | alta |
| finisher | Haiku/Sonnet | script | C/B | 2% | média |

### 7.3 Quatro configurações

| Configuração | Estratégia | Risco | Epics/mês estimados |
|---|---|---|---:|
| Econômica | Sonnet somente em código; Haiku/scripts no restante | médio | 5–10 |
| Equilibrada | Sonnet padrão; Opus em arquitetura/debug/review crítico | médio-alto | 3–7 |
| Qualidade máxima | Opus em decisões e código difícil; Sonnet em execução | alto | 1–3 |
| Próxima do limite | Sonnet contexto curto/Haiku; Opus bloqueado salvo incidente | baixo até reset | 1–2 adicionais |

### 7.4 Principais gargalos

- A franquia é compartilhada com o uso normal do Claude.
- Conversas longas ficam progressivamente mais caras em contexto.
- Opus pode ter limite semanal específico.
- Treze agentes com sessões independentes repetindo o repositório desperdiçam capacidade.
- O melhor desenho é compartilhar artefatos no Git e abrir sessões curtas por tarefa, não manter 13 chats extensos.

---

## 8. Análise do OpenCode Go

### 8.1 Distribuição equilibrada

| Agente | Principal | Fallback | Categoria | Consumo estimado | Prioridade |
|---|---|---|---|---:|---|
| planner | Qwen3.7 Plus | DeepSeek V4 Flash | A | 4% | alta |
| product manager | Qwen3.7 Plus | MiniMax M3 | B | 5% | média |
| requirements reviewer | DeepSeek V4 Pro | Qwen3.7 Plus | B/A | 6% | alta |
| tech analyst | GLM-5.2 | Qwen3.7 Max/DeepSeek Pro | A | 11% | crítica |
| doc writer | Kimi K2.6 | MiniMax M3 | B/C | 4% | baixa |
| issue creator | MiMo-V2.5/template | script | C/D | <1% | baixa |
| implementer | Kimi K2.7 Code | GLM-5.2 | A | 34% | crítica |
| SRE | GLM-5.2 | DeepSeek V4 Pro | A/B | 5% | crítica |
| reviewer | DeepSeek V4 Pro | GLM-5.2 | A | 17% | crítica |
| linter | determinístico | — | D | 0% | sem LLM |
| tester | Kimi K2.7 Code/DeepSeek Pro | ferramentas | B/D | 8% | alta |
| bug triager | GLM-5.2 | DeepSeek V4 Pro | A/B | 3% | alta |
| finisher | MiniMax M3 | MiMo-V2.5 | C/B | 2% | média |

### 8.2 Consumo por epic

Estimativas em dólares internos de uso Go:

| Configuração | Consumo por epic | Epics/mês pelo teto de US$ 60 | Ajuste prático |
|---|---:|---:|---:|
| Econômica | US$ 3–5 | 12–20 | 12–17 |
| Equilibrada | US$ 7–10 | 6–8 | 6–8 |
| Qualidade máxima | US$ 12–18 | 3–5 | 3–4 |
| Próxima do limite | US$ 2–3 | depende do saldo | 1–2 por US$ 5 restantes |

O ajuste prático considera reserva de 15–20%, limite semanal de US$ 30 e variação de contexto.

### 8.3 Quatro configurações

**Econômica:** DeepSeek V4 Flash/MiMo para planner, PM, docs e issues; Kimi K2.7 para implementação; DeepSeek Pro somente para revisão; GLM-5.2 somente após falha.

**Equilibrada:** tabela principal acima.

**Qualidade máxima:** GLM-5.2 em architect, implementer complexo, SRE e bug triage; DeepSeek Pro/GLM em review; Qwen3.7 Max em planejamento de alto risco. Limitar paralelismo para não atingir US$ 12 em cinco horas.

**Próxima do limite:** Flash/MiMo + scripts; congelar documentação, PM iterativo e revisão redundante; reservar o saldo para implementer e reviewer.

### 8.4 Vantagem de mensuração

A fórmula pode ser aplicada diretamente:

\[
E_{mensal} = \frac{60 \times (1-r)}{C_{epic}}
\]

Com reserva \(r=0,20\) e epic equilibrado de US$ 8:

\[
E_{mensal} = \frac{48}{8} = 6
\]

O usuário deve recalibrar `C_epic` após 5–10 fluxos reais usando o painel do OpenCode.

---

## 9. Comparação descritiva de utilização

| Métrica | Codex Plus | Claude Code Pro | OpenCode Go |
|---|---:|---:|---:|
| Custo mensal | US$ 20 | US$ 20 | US$ 10 |
| Modelos principais | Sol, Terra, Luna | Sonnet 5, Opus 4.8, Haiku quando disponível | 13 modelos publicados |
| Premium recomendado | GPT-5.6 Sol | Claude Opus 4.8 | GLM-5.2 |
| Econômico recomendado | GPT-5.6 Luna | Haiku ou Sonnet reduzido | DeepSeek V4 Flash/MiMo-V2.5 |
| Agentes premium equilibrado | 2–4 sob condição | 2–4 sob condição | 3–4 sob condição |
| Agentes sem LLM | 3–5 funções | 3–5 funções | 3–5 funções |
| Consumo por epic | não monetizado; estimado por turnos | não monetizado; estimado por sessão | US$ 7–10 equilibrado |
| Epics/mês conservador | 5 | 3 | 6 |
| Epics/mês provável | 7–8 | 5 | 6–8 |
| Epics/mês otimista | 10–15 | 7–10 | 8–12 com epic mais leve |
| Risco de throttling | médio-alto | alto em uso intenso | médio e mensurável |
| Previsibilidade | média-baixa | baixa | alta |
| Modelo por agente | possível, com adaptação da squad | possível via config/CLI | nativo e explícito |
| Adequação a 13 agentes | exige fusão/contexto compartilhado | exige forte contenção | adequada, mas 13 chamadas independentes ainda custam |
| Principal gargalo | limites semanais não divulgados | uso compartilhado e limites não divulgados | teto semanal/mensal em dólares |

Não há vencedor absoluto: os planos têm estruturas de capacidade diferentes e a produtividade depende do perfil do repositório.

---

## 10. Política de escalonamento

### Nível 0 — determinístico

Use sempre que a saída puder ser verificada integralmente por ferramenta:

- lint, format, build, testes, cobertura;
- Git/GitHub CLI;
- análise estática, segurança e dependências;
- atualização de labels;
- templates.

### Nível 1 — econômico

Critérios:

- até dois arquivos;
- menos de 200 linhas alteradas;
- solução já especificada;
- saída em JSON/YAML/template;
- documentação derivada;
- classificação de logs simples.

### Nível 2 — intermediário

Critérios:

- 3–8 arquivos;
- criação de testes;
- requisitos delimitados;
- implementação normal;
- investigação com hipótese clara;
- documentação técnica com contexto.

### Nível 3 — premium

Promover quando ocorrer pelo menos um:

- mudança em mais de oito arquivos;
- migração de dados/schema;
- concorrência, segurança, autenticação ou autorização;
- impacto direto em produção;
- falha repetida do modelo intermediário;
- baixa confiança declarada;
- bug sem reprodução;
- arquitetura ambígua;
- contexto relevante acima de 150–250 mil tokens;
- alteração transversal em múltiplos serviços;
- revisão de código crítico.

Rebaixar quando:

- ADR ou plano já aprovado;
- patch localizado;
- testes determinísticos cobrem o comportamento;
- tarefa é transformação de texto;
- saída tem schema rígido;
- contexto pode ser resumido em menos de 10 mil tokens.

---

## 11. Configurações finais

### 11.1 Codex Plus

```yaml
service: codex-chatgpt-plus
strategy: balanced

agents:
  planner:
    model: gpt-5.6-terra
    fallback: gpt-5.6-luna
    priority: high

  product-manager:
    model: gpt-5.6-terra
    fallback: gpt-5.6-luna
    priority: medium

  requirements-reviewer:
    model: gpt-5.6-terra
    fallback: gpt-5.6-sol
    escalate_on: [security, ambiguity, repeated_failure]
    priority: high

  tech-analyst:
    model: gpt-5.6-sol
    fallback: gpt-5.6-terra
    priority: critical

  doc-writer:
    model: gpt-5.6-luna
    fallback: gpt-5.6-terra
    priority: low

  issue-creator:
    execution: deterministic
    tool: gh issue create --template

  implementer:
    model: gpt-5.6-terra
    fallback: gpt-5.6-sol
    escalate_on: [more_than_8_files, migration, security, repeated_failure]
    priority: critical

  sre:
    model: gpt-5.6-sol
    fallback: gpt-5.6-terra
    run: on-demand
    priority: critical

  reviewer:
    model: gpt-5.6-sol
    fallback: gpt-5.6-terra
    priority: critical

  linter:
    execution: deterministic
    tool: project-lint-command

  tester:
    model_for_test_creation: gpt-5.6-terra
    execution: deterministic
    tool: project-test-command

  bug-triager:
    model: gpt-5.6-sol
    fallback: gpt-5.6-terra
    run: on-demand

  finisher:
    model: gpt-5.6-luna
    fallback: deterministic

limits:
  max-review-cycles: 2
  parallel-premium-agents: 1
  reserve-capacity-percent: 20
  stop-secondary-agents-at-percent: 75
```

### 11.2 Claude Code Pro

```yaml
service: claude-code-pro
strategy: balanced

agents:
  planner:
    model: claude-sonnet-5
    fallback: haiku-if-available
    priority: high

  product-manager:
    model: claude-sonnet-5
    fallback: haiku-if-available
    priority: medium

  requirements-reviewer:
    model: claude-sonnet-5
    fallback: claude-opus-4.8
    priority: high

  tech-analyst:
    model: claude-opus-4.8
    fallback: claude-sonnet-5
    priority: critical

  doc-writer:
    model: haiku-if-available
    fallback: claude-sonnet-5
    priority: low

  issue-creator:
    execution: deterministic
    tool: gh-issue-template

  implementer:
    model: claude-sonnet-5
    fallback: claude-opus-4.8
    priority: critical

  sre:
    model: claude-opus-4.8
    fallback: claude-sonnet-5
    run: on-demand

  reviewer:
    model: claude-sonnet-5
    fallback: claude-opus-4.8
    escalate_on: [security, production_critical]
    priority: critical

  linter:
    execution: deterministic

  tester:
    model_for_test_creation: claude-sonnet-5
    execution: deterministic

  bug-triager:
    model: claude-sonnet-5
    fallback: claude-opus-4.8
    run: on-demand

  finisher:
    model: haiku-if-available
    fallback: deterministic

limits:
  max-review-cycles: 2
  parallel-opus-agents: 1
  reserve-capacity-percent: 25
  start-new-session-per-story: true
  persist-state-in-repository: true
```

### 11.3 OpenCode Go

```yaml
service: opencode-go
strategy: balanced

agents:
  planner:
    model: qwen3.7-plus
    fallback: deepseek-v4-flash
    priority: high

  product-manager:
    model: qwen3.7-plus
    fallback: minimax-m3
    priority: medium

  requirements-reviewer:
    model: deepseek-v4-pro
    fallback: qwen3.7-plus
    priority: high

  tech-analyst:
    model: glm-5.2
    fallback: deepseek-v4-pro
    priority: critical

  doc-writer:
    model: kimi-k2.6
    fallback: minimax-m3
    priority: low

  issue-creator:
    execution: deterministic
    tool: gh-issue-template

  implementer:
    model: kimi-k2.7-code
    fallback: glm-5.2
    priority: critical

  sre:
    model: glm-5.2
    fallback: deepseek-v4-pro
    run: on-demand

  reviewer:
    model: deepseek-v4-pro
    fallback: glm-5.2
    priority: critical

  linter:
    execution: deterministic

  tester:
    model_for_test_creation: kimi-k2.7-code
    fallback: deepseek-v4-pro
    execution: deterministic

  bug-triager:
    model: deepseek-v4-pro
    fallback: glm-5.2
    run: on-demand

  finisher:
    model: minimax-m3
    fallback: mimo-v2.5

limits:
  max-review-cycles: 2
  parallel-premium-agents: 2
  reserve-capacity-percent: 20
  five-hour-soft-budget-usd: 9
  weekly-soft-budget-usd: 24
  monthly-soft-budget-usd: 48
```

---

## 12. Análise de sensibilidade

### 12.1 Variação de ±25%

| Variável | -25% | Base | +25% | Efeito principal |
|---|---:|---:|---:|---|
| chamadas por epic | 30–39 | 39–52 | 49–65 | capacidade quase inversa |
| contexto | 300K–1,35M | 400K–1,8M | 500K–2,25M | penaliza Claude/Codex e modelos caros |
| ciclos de revisão | 1 | 1–2 | 2–3 | reviewer/implementer dominam consumo |
| falha/refação | 10–20% | 15–35% | 19–44% | aumenta consumo premium |
| uso premium | 15% | 25% | 31% | reduz volume, melhora casos difíceis |
| paralelismo | sequencial | 1–2 | 2–3 | aumenta risco de janela curta |
| duração da sessão | curta | moderada | longa | contexto acumulado cresce |
| custo Go por epic | US$ 5,25–7,50 | US$ 7–10 | US$ 8,75–12,50 | 4–9 epics/mês |

### 12.2 Decisões robustas

Estas decisões permanecem válidas em todos os cenários:

1. Implementer e reviewer concentram a maior parcela do consumo.
2. Lint, teste existente, Git e CI não devem usar LLM.
3. Premium deve ser reservado para arquitetura, debugging e revisão crítica.
4. Handoffs em arquivos reduzem repetição de contexto.
5. Mais de dois ciclos de revisão raramente cabe bem em assinatura individual.
6. Paralelismo premium aumenta risco de throttling sem aumentar proporcionalmente o trabalho útil.
7. A squad de 13 papéis deve ser lógica, não 13 sessões longas simultâneas.
8. PM e requirements reviewer devem ter limite de um retorno antes de intervenção humana.
9. Documentação deve ser gerada a partir de artefatos aprovados, não redescobrir o repositório.
10. Manter reserva de 20–25% é mais eficiente que consumir 100% em tarefas de baixo risco e ficar sem capacidade para debugging.

---

## 13. Conclusões

### Distribuição recomendada

- **Codex Plus:** Terra como padrão, Sol para trabalho crítico e Luna para alto volume/mecânico.
- **Claude Pro:** Sonnet 5 como padrão, Opus 4.8 como escalonamento excepcional e Haiku quando disponível para tarefas simples.
- **OpenCode Go:** Kimi K2.7 Code para implementação; GLM-5.2 para casos difíceis; DeepSeek V4 Pro/Qwen3.7 Plus para análise; Flash/MiMo para volume.

### Maiores consumidores

Em todas as plataformas:

1. implementer: 30–38%;
2. reviewer: 14–20%;
3. architect/tech analyst: 8–13%;
4. tester que cria testes: 6–10%.

### Agentes que precisam dos melhores modelos

- tech analyst/architect;
- implementer em tarefa multiarquivo ou de alto risco;
- reviewer de código crítico;
- bug triager em falha difícil;
- SRE em mudanças de infraestrutura e produção.

### Agentes econômicos

- documentation writer derivativo;
- issue creator;
- finisher;
- PM em refinamento já estruturado;
- classificadores e sumarizadores.

### Agentes sem LLM

- linter;
- executor de testes existentes;
- formatador;
- Git/commit/tag;
- CI;
- coleta de logs;
- atualização mecânica de labels;
- changelog baseado em Conventional Commits.

### Limites que podem impedir a squad

- Codex: limite semanal não publicado e consumo de tarefas longas.
- Claude: franquia compartilhada com uso geral e limites de cinco horas/semana não publicados.
- Go: US$ 30 por semana e US$ 60 por mês; modelos premium caros podem consumir a janela rapidamente.

### Ajuste próximo ao limite

1. congelar documentação opcional;
2. desativar PM/reviewer iterativo;
3. trocar premium por econômico em tarefas delimitadas;
4. manter apenas implementer, tester determinístico e reviewer;
5. reduzir contexto para diff + ADR + testes;
6. impedir paralelismo premium;
7. reservar o restante para blocker, segurança e release.

---

## 14. Fontes

Consulta em 12 de julho de 2026.

| Fonte | Organização | URL | Tipo | Conflito potencial |
|---|---|---|---|---|
| Codex Pricing | OpenAI | https://developers.openai.com/codex/pricing | documentação oficial | fornecedor do produto |
| Using Codex with your ChatGPT plan | OpenAI | https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan | ajuda oficial | fornecedor |
| Introducing the Codex app | OpenAI | https://openai.com/index/introducing-the-codex-app/ | anúncio oficial | fornecedor |
| Claude pricing | Anthropic | https://claude.com/pricing | preço oficial | fornecedor |
| What is the Pro plan? | Anthropic | https://support.claude.com/en/articles/8325606-what-is-the-pro-plan | ajuda oficial | fornecedor |
| Use Claude Code with Pro or Max | Anthropic | https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | ajuda oficial | fornecedor |
| Claude Code model configuration | Anthropic | https://code.claude.com/docs/en/model-config | documentação oficial | fornecedor |
| Introducing Claude Sonnet 5 | Anthropic | https://www.anthropic.com/news/claude-sonnet-5 | anúncio/model card | fornecedor |
| OpenCode Go | OpenCode | https://opencode.ai/docs/go/ | documentação e preço | fornecedor |
| OpenCode models | OpenCode | https://opencode.ai/docs/models/ | documentação oficial | fornecedor |
| orchestrated-squad | Rodrigo Gregori/GitHub | https://github.com/gregori/orchestrated-squad | repositório analisado | autor do cenário |
| SWE-bench leaderboards | SWE-bench | https://www.swebench.com/ | benchmark independente | limitações do harness |
| SWE-bench Pro paper | Scale AI et al. | https://arxiv.org/abs/2509.16941 | artigo/benchmark | organizador do benchmark |
| Why SWE-bench Verified is no longer enough | OpenAI | https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ | análise do fornecedor | interesse em novo benchmark |
| Aider leaderboard | Aider | https://aider.chat/docs/leaderboards/ | benchmark de ferramenta | scaffold próprio |
| Terminal-Bench | Laude Institute | https://www.tbench.ai/ | benchmark de agentes | configuração específica |

---

### Limitações do relatório

- As listas de modelos podem mudar após a data de corte.
- Claude Pro e Codex Plus não publicam uma franquia mensal fixa convertível em epics.
- Benchmarks de modelos lançados muito recentemente têm poucos resultados independentes padronizados.
- O custo real depende do tamanho do repositório, cache, ferramentas, retries e qualidade das instruções.
- As estimativas de volume devem ser recalibradas com telemetria de 5–10 epics reais.
