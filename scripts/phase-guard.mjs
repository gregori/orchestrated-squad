/**
 * Hook global por fase (Devin CLI, Claude Code e outros com hook PreToolUse global).
 *
 * O payload do hook não diz qual agente está chamando, mas a run ativa diz em
 * que fase o trabalho está. Se a fase tem `write_allowlist` (ADR 0003), nega
 * escrita fora dela, venha do especialista ou da raiz. Comandos do runtime da
 * squad (`node .squad/bin/squad.mjs …`) continuam permitidos: é por eles que a
 * raiz grava em `.workflow/`.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { readOnlyReason, toolOf } from './agent-hooks.mjs';
import { covered } from './scope-check.mjs';
import { loadWorkflow } from './workflow-state.mjs';

const PATH_KEYS = ['file_path', 'filePath', 'path', 'target_file', 'targetFile', 'notebook_path', 'filename'];
const SQUAD_RUNTIME = /^\s*node\s+("[^"]*|\S*)\.squad\/bin\/squad\.mjs"?\s+[^;&|`$<>]*$/;

export function projectDir(env = process.env) {
  return env.DEVIN_PROJECT_DIR || env.CLAUDE_PROJECT_DIR || process.cwd();
}

/** Run ativa mais recente (estado diferente de complete), ou null. */
export async function activeRun(root) {
  const base = path.join(root, '.workflow', 'runs');
  let names = [];
  try { names = await readdir(base); } catch { return null; }
  let best = null;
  for (const name of names) {
    const file = path.join(base, name, 'state.json');
    try {
      const state = JSON.parse(await readFile(file, 'utf8'));
      if (state.status === 'complete') continue;
      const mtime = (await stat(file)).mtimeMs;
      if (!best || mtime > best.mtime) best = { state, mtime };
    } catch { /* não é uma run */ }
  }
  return best?.state ?? null;
}

function editedPaths(input) {
  const paths = PATH_KEYS.map((key) => input?.[key]).filter((value) => typeof value === 'string');
  for (const edit of input?.edits ?? []) if (typeof edit?.file_path === 'string') paths.push(edit.file_path);
  return paths;
}

/** Motivo da negação, ou null para permitir. */
export async function phaseGuardReason(payload, root = projectDir()) {
  const state = await activeRun(root);
  if (!state || state.status === 'blocked') return null;
  const workflow = await loadWorkflow(state.workflow).catch(() => null);
  const allowlist = workflow?.write_allowlist?.[state.phase];
  if (!allowlist) return null;
  const { tool, input } = toolOf(payload);
  const command = String(input.command ?? input.cmd ?? input.commandLine ?? '');
  if (command && SQUAD_RUNTIME.test(command)) return null;
  const outside = editedPaths(input)
    .map((file) => path.relative(root, path.resolve(root, file)).split(path.sep).join('/'))
    .filter((file) => !allowlist.some((entry) => covered(file, entry)));
  if (outside.length) return `phase '${state.phase}' of run '${state.run_id}' may only write ${allowlist.join(', ')} (tried ${outside.join(', ')})`;
  const reason = readOnlyReason(payload, { allowSquadState: true });
  if (reason && !editedPaths(input).length) return `phase '${state.phase}' of run '${state.run_id}' is read-only: ${reason}`;
  return null;
}
