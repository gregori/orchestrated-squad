import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCodexAgents } from './render-codex.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function validateCodexTarget() {
  const failures = []; const config = await readFile(path.join(root, '.codex', 'config.toml'), 'utf8');
  if (!/max_depth\s*=\s*1/.test(config)) failures.push('Codex max_depth must be 1');
  if (!/max_threads\s*=\s*4/.test(config)) failures.push('Codex max_threads must be 4');
  const expected = await renderCodexAgents();
  for (const [file, content] of Object.entries(expected)) {
    let actual = ''; try { actual = await readFile(path.join(root, '.codex', 'agents', file), 'utf8'); } catch { failures.push(`Missing .codex/agents/${file}`); continue; }
    if (actual !== content) failures.push(`Codex agent drift: ${file}`);
    if (!/developer_instructions\s*=\s*"""/.test(actual)) failures.push(`Missing developer_instructions: ${file}`);
  }
  return failures;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const failures = await validateCodexTarget(); if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; } else console.log('Codex target is valid and has no drift.'); }
