# ADR 0004: Especialistas somente leitura sem caminho de escrita

- Status: accepted
- Data: 2026-11-23

## Contexto

product-manager, requirements-reviewer, tech-analyst, reviewer e bug-triager
têm `write_scope: none` no registry, mas em alguns runtimes recebiam
ferramentas de edição para gravar o próprio resultado em `.workflow/`. Uma
allowlist por caminho não existe em todos os harnesses:

| Runtime | Restrição de escrita disponível |
|---|---|
| Claude Code | `tools`/`disallowedTools` e hooks `PreToolUse` no frontmatter do subagente. Regras de permissão por caminho valem para a sessão inteira, não por subagente |
| OpenCode | `permission.edit` por agente, com padrões de caminho |
| VS Code (Copilot, harness Local) | `tools` e hooks no frontmatter do `.agent.md`. No harness Copilot, hooks por agente não se aplicam |
| Codex | `sandbox_mode` por agente; relatos indicam que versões recentes herdam o sandbox do pai |
| Devin CLI | `allowed-tools`, sem regra por caminho |
| oh-my-pi | `tools` por agente |

## Decisão

1. **Contrato de saída:** especialistas somente leitura devolvem o resultado
   como texto. A sessão raiz grava com
   `squad state record <run-id> --artifact <nome> --stdin`, que escreve
   `.workflow/runs/<run-id>/<nome>.md` e registra o artefato.
2. **Sem ferramentas de escrita em nenhum runtime:** Claude
   (`disallowedTools: Edit, Write, MultiEdit, NotebookEdit`), OpenCode
   (`permission.edit: deny`), Copilot (sem `edit`), Codex
   (`sandbox_mode = "read-only"`), Devin e oh-my-pi (sem `edit`/`write`).
3. **Hook `PreToolUse` de negação** nos agentes Claude e Copilot:
   `squad hook read-only` nega ferramentas de escrita e comandos de shell que
   alteram arquivos (redirecionamento, `rm`, `mv`, `sed -i`, `git commit`,
   instalação de pacotes, mudança de estado da run). Responde no formato de
   decisão `permissionDecision: deny`, com o motivo.
4. **`check:drift`** falha se um agente somente leitura ganhar caminho de
   escrita em qualquer runtime.

## Consequências

- A garantia continua em camadas: ferramentas removidas e hook (prevenção,
  onde o harness suporta) e `write_allowlist` das fases (detecção portável,
  ADR 0003), que pega inclusive o que escapar da heurística de shell.
- O hook roda via `npx`, com latência por chamada de ferramenta de escrita ou
  shell nesses agentes.
- O formato do payload de hook no VS Code (`tool_name`/`tool_input` ou
  `toolName`/`toolInput`) é aceito nas duas formas; a validar em uso real.
