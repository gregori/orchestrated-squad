import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileHash, readState } from './workflow-state.mjs';

const IGNORED = ['.workflow/', '.squad/'];

function git(root, args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
}

/** Arquivos alterados desde `base` (commitados, no índice, na árvore e não rastreados). */
export function changedFiles(root, base) {
  const tracked = git(root, base ? ['diff', '--name-only', base] : ['diff', '--name-only', 'HEAD']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']);
  if (tracked === null && untracked === null) return null;
  return [...new Set(`${tracked ?? ''}\n${untracked ?? ''}`.split('\n').map((line) => line.trim()).filter(Boolean))]
    .filter((file) => !IGNORED.some((prefix) => file.startsWith(prefix))).sort();
}

/** Uma reserva cobre o arquivo exato, uma pasta (`src/` ou `src/**`) ou um prefixo com `*` final. */
export function covered(file, reservation) {
  const pattern = reservation.replace(/\/\*\*$/, '/');
  if (pattern.endsWith('/')) return file.startsWith(pattern);
  if (pattern.endsWith('*')) return file.startsWith(pattern.slice(0, -1));
  return file === pattern;
}

/** Compara o diff da run com a união das reservas de `write_scope`. */
export async function scopeCheck({ root, runDir }) {
  const state = await readState(runDir);
  const files = changedFiles(root, state.base_ref || null);
  if (files === null) return { ok: false, summary: 'git is unavailable: scope cannot be verified', outside: [] };
  const reservations = Object.values(state.reservations ?? {}).flat();
  const baseline = state.baseline ?? {};
  const touched = [];
  for (const file of files) {
    // já estava alterado quando a run começou e não mudou desde então: não é desta run
    if (baseline[file] && baseline[file] === await fileHash(path.join(root, file))) continue;
    touched.push(file);
  }
  const outside = touched.filter((file) => !reservations.some((reservation) => covered(file, reservation)));
  return {
    ok: outside.length === 0,
    summary: outside.length ? `${outside.length} file(s) changed outside the reserved write_scope` : `${touched.length} changed file(s) within the reserved write_scope`,
    changed: touched,
    outside,
  };
}
