import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function validateDevinTarget() {
  const failures = []; const registry = JSON.parse(await readFile(path.join(root, 'squad/agents/registry.json'), 'utf8'));
  const profiles = JSON.parse(await readFile(path.join(root, 'squad/devin/profiles.json'), 'utf8')).profiles;
  for (const agent of registry.agents) {
    const profile = profiles[agent.name]; if (!profile) { failures.push(`Missing Devin profile policy: ${agent.name}`); continue; }
    const file = path.join(root, '.devin/agents', agent.name, 'AGENT.md'); let body = ''; try { body = await readFile(file, 'utf8'); } catch { failures.push(`Missing Devin AGENT.md: ${agent.name}`); continue; }
    for (const expected of [`name: ${agent.name}`, `model: ${profile.model}`, `fallback-model: ${profile.fallback}`, `execution-mode: ${profile.execution_mode}`]) if (!body.includes(expected)) failures.push(`Profile drift (${agent.name}): ${expected}`);
    if (agent.write_scope === 'none' && !body.includes('allowed-tools: [read, grep, glob]')) failures.push(`Read-only profile has mutable tools: ${agent.name}`);
    if (agent.write_scope !== 'none' && profile.execution_mode !== 'foreground') failures.push(`Writer must be foreground: ${agent.name}`);
  }
  return failures;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const failures = await validateDevinTarget(); if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; } else console.log('Devin profiles are valid.'); }
