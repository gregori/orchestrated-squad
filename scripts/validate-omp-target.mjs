import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOmpAgents, models } from './render-omp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowed = new Set(Object.values(models).flat());

export async function validateOmpTarget() {
  const failures = [];
  const expected = await renderOmpAgents();
  for (const [file, content] of Object.entries(expected)) {
    let actual = '';
    try {
      actual = await readFile(path.join(root, '.omp', 'agents', file), 'utf8');
    } catch {
      failures.push(`Missing .omp/agents/${file}`);
      continue;
    }
    if (actual !== content) failures.push(`OMP agent drift: ${file}`);
    if (!/^name:\s*\S+/m.test(actual)) failures.push(`Missing name frontmatter: ${file}`);
    if (!/^description:\s*\S+/m.test(actual)) failures.push(`Missing description frontmatter: ${file}`);
    if (!/^spawns:\s*\[\]/m.test(actual)) failures.push(`Specialists must not delegate (spawns: []): ${file}`);
    if (/^\s*tools:.*\btask\b/m.test(actual)) failures.push(`Specialists must not carry the task tool: ${file}`);
    for (const match of actual.matchAll(/^  - (\S+)\s*$/gm)) {
      const selector = match[1];
      if (!selector.includes('/')) failures.push(`Bare model name (must be provider-qualified): ${file}: ${selector}`);
      else if (!allowed.has(selector)) failures.push(`Unknown model selector: ${file}: ${selector}`);
    }
  }
  let commands = [];
  try {
    commands = (await readdir(path.join(root, '.omp', 'commands'))).filter((f) => f.startsWith('squad-'));
  } catch {
    failures.push('Missing .omp/commands/');
  }
  if (!commands.length) failures.push('No squad-* commands in .omp/commands/');
  for (const file of commands) {
    const body = await readFile(path.join(root, '.omp', 'commands', file), 'utf8');
    if (!/^description:\s*\S+/m.test(body)) failures.push(`Missing description frontmatter: .omp/commands/${file}`);
    if (/^agent:\s*planner/m.test(body)) failures.push(`OpenCode-only frontmatter leaked: .omp/commands/${file}`);
  }
  let skills = [];
  try {
    skills = (await readdir(path.join(root, '.omp', 'skills'))).filter((f) => f.startsWith('squad-'));
  } catch {
    failures.push('Missing .omp/skills/');
  }
  if (!skills.length) failures.push('No squad-* skills in .omp/skills/');
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = await validateOmpTarget();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else console.log('OMP target is valid and has no drift.');
}
