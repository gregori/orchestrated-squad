# ADR 0005: Runtime local e hooks por agente e por fase

- Status: accepted
- Data: 2026-11-23
- Substitui: o uso de `npx …@latest` nas skills (ADR 0002) e nos hooks (ADR 0004)

## Contexto

Skills e hooks chamavam `npx -y @gregori/orchestrated-squad@latest`. Isso
resolve o pacote no registry a cada chamada (segundos por edição ou comando de
shell nos hooks), falha sem rede e pode executar uma versão diferente da
instalada. Shell script não roda no Windows sem bash, e Python não é garantido;
Node já é requisito do instalador.

Além disso, o Devin CLI tem hooks `PreToolUse` só globais (`.devin/hooks.v1.json`
ou a chave `hooks` de `.devin/config.json`), e o payload documentado traz
`tool_name`, `tool_input` e `session_id`, sem identificar o subagente.

## Decisão

1. **Runtime local.** O instalador copia para `.squad/bin/` o CLI de estado,
   gates e hooks (`squad.mjs` a partir de `scripts/runtime.mjs`, mais os
   módulos sem dependências e `workflows/*.json`) e grava `VERSION`. Skills e
   hooks usam `node .squad/bin/squad.mjs …`. Os arquivos entram no manifest
   (preservados se o usuário alterar; removidos no `uninstall`). O `doctor`
   compara `VERSION` com o pacote.
2. **Hook por agente** (`hook read-only`, ADR 0004) chama o runtime local. No
   Codex, vai no TOML dos agentes somente leitura (`[[hooks.PreToolUse]]`),
   já que o arquivo do agente é carregado como camada de configuração.
3. **Hook por fase** (`hook phase-guard`), global: encontra a run ativa e, se a
   fase atual tem `write_allowlist`, nega edição fora dela e comandos de shell
   que alteram arquivos. Comandos do próprio runtime
   (`node .squad/bin/squad.mjs …`, sem encadeamento) são permitidos, para a raiz
   gravar em `.workflow/`. Instalado em `.claude/settings.json`,
   `.devin/config.json` e `.codex/hooks.json`. No Codex, `apply_patch` traz o
   patch em `tool_input.command`; os caminhos são lidos das linhas
   `*** Add|Update|Delete File:` e `*** Move to:`, e a raiz do projeto vem do
   `cwd` do payload.
4. **Protocolo único de negação:** JSON `permissionDecision: deny` no stdout,
   motivo no stderr e código de saída 2. Serve a Claude Code, VS Code e Devin.
5. **`SQUAD_HOOK_LOG=1`** grava uma linha por chamada (hook, ferramenta,
   sessão, decisão; sem conteúdo) em `.workflow/hook-log.jsonl`.
6. O merge de JSON do instalador deduplica itens de array por conteúdo, para
   que reinstalar não duplique hooks.

## Consequências

- Os hooks custam dezenas de milissegundos por chamada, e funcionam offline.
- O phase-guard vale para todos na fase, inclusive a raiz: em fase somente
  leitura, só `.workflow/` e o runtime da squad escrevem.
- **A confirmar no Devin:** se os hooks disparam dentro de subagentes (a
  documentação não diz). Teste com `SQUAD_HOOK_LOG=1` durante um
  `squad-review`. Se não disparar, o Devin fica com a ausência de ferramentas
  de escrita e a detecção por fase (ADR 0003).
- Os comandos dos hooks usam sintaxe de shell POSIX (`${CLAUDE_PROJECT_DIR:-…}`,
  `$(git rev-parse …)`). No Windows, a premissa é Git Bash ou Cygwin.
- **Codex:** hooks de projeto só carregam em projeto confiável, e cada hook
  precisa ser revisado uma vez (`/hooks`); a confiança é ligada ao hash, então
  um hook alterado por `squad update` precisa ser aprovado de novo. **A
  confirmar:** se o PreToolUse dispara dentro de subagentes e se o hook no TOML
  do agente tem efeito (a documentação não diz; subagentes usam o session id do
  pai). Teste com `SQUAD_HOOK_LOG=1`.
