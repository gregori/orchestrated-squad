import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAgentIndex } from './render-agent-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Alias do Claude Code para cada classe de modelo (CLAUDE.md: haiku, sonnet, opus). */
export const CLAUDE_ALIASES = { economy: 'haiku', standard: 'sonnet', premium: 'opus' };

/** Divergências entre a classe canônica (registry e models.yaml) e o frontmatter dos agentes Claude. */
export async function modelDrift() {
  const registry = JSON.parse(await readFile(path.join(root, 'squad', 'agents', 'registry.json'), 'utf8'));
  const models = await readFile(path.join(root, 'squad', 'models.yaml'), 'utf8');
  const roles = Object.fromEntries([...models.matchAll(/^ {2}([a-z-]+):\s*([a-z]+)\s*$/gm)].filter(([, , cls]) => cls in CLAUDE_ALIASES).map(([, name, cls]) => [name, cls]));
  const problems = [];
  for (const agent of registry.agents) {
    if (roles[agent.name] && roles[agent.name] !== agent.model_class) problems.push(`${agent.name}: registry says ${agent.model_class}, models.yaml says ${roles[agent.name]}`);
    let text;
    try { text = await readFile(path.join(root, '.claude', 'agents', `${agent.name}.md`), 'utf8'); } catch { continue; }
    const declared = text.match(/^model:\s*(\S+)/m)?.[1];
    const expected = CLAUDE_ALIASES[agent.model_class];
    if (expected && declared !== expected) problems.push(`.claude/agents/${agent.name}.md: model ${declared ?? '(none)'} but class ${agent.model_class} requires ${expected}`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = await renderAgentIndex();
  const actual = await readFile(path.join(root, 'squad', 'generated', 'agent-index.json'), 'utf8');
  const problems = await modelDrift();
  if (actual !== expected) problems.unshift('Generated agent index has drifted. Regenerate it with: node scripts/render-agent-index.mjs > squad/generated/agent-index.json');
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  else console.log('Generated artifacts and model classes have no drift.');
}
