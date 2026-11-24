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

const HOOK = 'hook read-only';

/** Especialistas com `write_scope: none` não podem ter escrita em nenhum runtime. */
export async function readOnlyDrift() {
  const registry = JSON.parse(await readFile(path.join(root, 'squad', 'agents', 'registry.json'), 'utf8'));
  const problems = [];
  const read = async (file) => { try { return await readFile(path.join(root, file), 'utf8'); } catch { return null; } };
  const frontmatter = (text) => text?.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  for (const agent of registry.agents.filter((a) => a.write_scope === 'none')) {
    const { name } = agent;
    const claude = frontmatter(await read(`.claude/agents/${name}.md`));
    if (claude) {
      const tools = claude.match(/^tools:\n((?: {2}- .*\n?)*)/m)?.[1] ?? '';
      if (/- (Edit|Write|MultiEdit|NotebookEdit)\b/.test(tools)) problems.push(`.claude/agents/${name}.md: read-only agent lists a write tool`);
      if (!/disallowedTools:[\s\S]*- Edit[\s\S]*- Write/.test(claude)) problems.push(`.claude/agents/${name}.md: Edit/Write must be in disallowedTools`);
      if (!claude.includes(HOOK)) problems.push(`.claude/agents/${name}.md: missing the read-only PreToolUse hook`);
    }
    const opencode = frontmatter(await read(`.opencode/agents/${name}.md`));
    if (opencode && !/^ {2}edit: deny$/m.test(opencode)) problems.push(`.opencode/agents/${name}.md: permission.edit must be deny`);
    const copilot = frontmatter(await read(`.github/agents/${name}.agent.md`));
    if (copilot) {
      if (/^tools:.*['"]edit['"]/m.test(copilot)) problems.push(`.github/agents/${name}.agent.md: read-only agent lists the edit tool`);
      if (!copilot.includes(HOOK)) problems.push(`.github/agents/${name}.agent.md: missing the read-only PreToolUse hook`);
    }
    const codex = await read(`.codex/agents/${name}.toml`);
    if (codex && !/^sandbox_mode = "read-only"$/m.test(codex)) problems.push(`.codex/agents/${name}.toml: sandbox_mode must be read-only`);
    for (const file of [`.devin/agents/${name}/AGENT.md`, `.omp/agents/${name}.md`]) {
      const fm = frontmatter(await read(file));
      if (fm && /^(allowed-tools|tools):.*\b(edit|write)\b/m.test(fm)) problems.push(`${file}: read-only agent lists a write tool`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = await renderAgentIndex();
  const actual = await readFile(path.join(root, 'squad', 'generated', 'agent-index.json'), 'utf8');
  const problems = [...(await modelDrift()), ...(await readOnlyDrift())];
  if (actual !== expected) problems.unshift('Generated agent index has drifted. Regenerate it with: node scripts/render-agent-index.mjs > squad/generated/agent-index.json');
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  else console.log('Generated artifacts, model classes and read-only agents have no drift.');
}
