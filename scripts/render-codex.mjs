import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const models = { economy: 'luna', standard: 'terra', premium: 'sol' };
const instructions = {
  'product-manager': 'Return structured requirements and questions only. Do not edit files or invoke subagents. The root session performs user checkpoints and creates any direct specialists.',
  'requirements-reviewer': 'Review requirements for ambiguity, missing acceptance criteria, and risk. Return evidence and questions only. Do not edit files or invoke subagents.',
  'tech-analyst': 'Analyze architecture, constraints, and implementation options. Return a bounded recommendation with risks and file-level scope. Do not edit files or invoke subagents.',
  'doc-writer': 'Create only approved documentation artifacts in the assigned write scope. Record files changed and validation evidence in the run handoff. Do not invoke subagents.',
  implementer: 'Implement only the task and write scope assigned by the root session. Add or update focused tests, run relevant deterministic gates, and return changed files and evidence. Do not invoke subagents.',
  sre: 'Change only explicitly assigned infrastructure files. Record commands, exit codes, and changed files. Do not invoke subagents or create external resources without a root checkpoint.',
  reviewer: 'Independently review correctness, security, and test evidence. Return findings with file references and severity. Do not edit files or invoke subagents.',
  'test-author': 'Author only tests within the assigned scope. Do not change production code unless the root session explicitly expands the task. Return tests run and results; do not invoke subagents.',
  'bug-triager': 'Diagnose with reproduction evidence, hypotheses, and a bounded likely cause. In diagnose mode, do not edit files. Do not invoke subagents.'
};
const quote = (value) => JSON.stringify(value);
export async function renderCodexAgents() {
  const { agents } = JSON.parse(await readFile(path.join(root, 'squad', 'agents', 'registry.json'), 'utf8'));
  return Object.fromEntries(agents.map((agent) => [`${agent.name}.toml`, `# generated_from: squad/agents/registry.json\nname = ${quote(agent.name)}\ndescription = ${quote(agent.description)}\nmodel = ${quote(models[agent.model_class])}\nsandbox_mode = ${quote(agent.write_scope === 'none' ? 'read-only' : 'workspace-write')}\ndeveloper_instructions = \"\"\"\n${instructions[agent.name]}\n\"\"\"\n`]));
}
