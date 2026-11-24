/**
 * Hooks de ferramenta para especialistas somente leitura (Claude Code e VS Code).
 *
 * `squad hook read-only` lê o payload do hook (PreToolUse) no stdin e nega
 * ferramentas de escrita e comandos de shell que alteram arquivos. É defesa em
 * profundidade: a garantia portável continua sendo a `write_allowlist` das
 * fases (ADR 0003), que detecta qualquer escrita, inclusive as que escapam
 * desta heurística.
 */

const EDIT_TOOL = /(edit|write|patch|create|delete|remove|rename|move|replace|insert)/i;
const NOT_FILE_TOOL = /todo/i; // TodoWrite mexe na lista de tarefas, não em arquivos
const SHELL_TOOL = /^(bash|shell|sh|terminal|run_?in_?terminal|execute|exec|run_?command|runcommands)$/i;

const SHELL_WRITES = [
  [/\btee\b/, 'tee'],
  [/\bsed\s+(-[a-zA-Z]*i|--in-place)/, 'sed -i'],
  [/\bperl\s+-[a-zA-Z]*i/, 'perl -i'],
  [/(^|[\s;&|(])(rm|mv|cp|mkdir|rmdir|touch|chmod|chown|ln|truncate|dd|unlink)\s/, 'file-changing command'],
  [/\bgit\s+(add|commit|checkout|switch|reset|restore|stash|apply|am|rebase|merge|cherry-pick|push|clean|rm|mv|tag|branch\s+-[dDmM])\b/, 'git command that changes the repository'],
  [/\b(npm|pnpm|yarn|bun)\s+(i|install|add|remove|uninstall|update|ci|link)\b/, 'package installation'],
  [/\bpip3?\s+(install|uninstall)\b/, 'package installation'],
  [/\bsquad\s+state\s+(transition|annotate|record|reserve|release|init)\b/, 'run state change (reserved to the root session)'],
];

function redirections(command) {
  const found = [];
  for (const match of command.matchAll(/\d*>>?\s*([^\s;&|]+)?/g)) {
    const target = match[1] ?? '';
    if (target.startsWith('&') || target === '/dev/null' || target === '') continue;
    found.push(target);
  }
  return found;
}

/** Motivo da negação, ou null para permitir. */
export function readOnlyReason(payload) {
  const tool = String(payload.tool_name ?? payload.toolName ?? payload.tool ?? '');
  const input = payload.tool_input ?? payload.toolInput ?? payload.input ?? {};
  if (!tool) return null;
  if (SHELL_TOOL.test(tool)) {
    const command = String(input.command ?? input.cmd ?? input.commandLine ?? '');
    const targets = redirections(command);
    if (targets.length) return `output redirection to ${targets.join(', ')}`;
    for (const [pattern, label] of SHELL_WRITES) if (pattern.test(command)) return label;
    return null;
  }
  if (!NOT_FILE_TOOL.test(tool) && EDIT_TOOL.test(tool)) return `tool ${tool} changes files`;
  return null;
}

/** Saída no formato de decisão do PreToolUse (Claude Code e VS Code). Permitir = nenhuma saída. */
export function readOnlyHook(raw) {
  let payload;
  try { payload = JSON.parse(raw || '{}'); } catch { return null; }
  const reason = readOnlyReason(payload);
  if (!reason) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Read-only specialist: ${reason} is not allowed. Return your result as text; the root session records it with \`squad state record\`.`,
    },
  };
}
