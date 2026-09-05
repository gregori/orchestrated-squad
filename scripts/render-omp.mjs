import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// F0-validated fallback chains (provider-qualified, never bare class names).
export const models = {
  economy: ['opencode-go/glm-5.3-flash', 'openai-codex/gpt-5.6-luna', 'google-antigravity/gemini-3.1-flash-lite'],
  standard: ['opencode-go/muse-spark-1.3-contributor', 'openai-codex/gpt-5.6-terra', 'anthropic/claude-sonnet-5'],
  premium: ['openai-codex/gpt-5.6-sol', 'anthropic/claude-sonnet-5', 'anthropic/claude-opus-5'],
};

const instructions = {
  'product-manager': 'Return structured requirements and questions only. Do not edit files or invoke subagents. The root session performs user checkpoints and creates any direct specialists.',
  'requirements-reviewer': 'Review requirements for ambiguity, missing acceptance criteria, and risk. Return evidence and questions only. Do not edit files or invoke subagents.',
  'tech-analyst': 'Analyze architecture, constraints, and implementation options. Return a bounded recommendation with risks and file-level scope. Do not edit files or invoke subagents.',
  'doc-writer': 'Create only approved documentation artifacts in the assigned write scope. Record files changed and validation evidence in the run handoff. Do not invoke subagents.',
  implementer: 'Implement only the task and write scope assigned by the root session. Add or update focused tests, run relevant deterministic gates, and return changed files and evidence. Do not invoke subagents.',
  sre: 'Change only explicitly assigned infrastructure files. Record commands, exit codes, and changed files. Do not invoke subagents or create external resources without a root checkpoint.',
  reviewer: 'Independently review correctness, security, and test evidence. Return findings with file references and severity. Do not edit files or invoke subagents. Note: this project agent intentionally shadows the bundled reviewer with a squad checklist.',
  'test-author': 'Author only tests within the assigned scope. Do not change production code unless the root session explicitly expands the task. Return tests run and results; do not invoke subagents.',
  'bug-triager': 'Diagnose with reproduction evidence, hypotheses, and a bounded likely cause. In diagnose mode, do not edit files. Do not invoke subagents.',
};

const readOnly = new Set(['product-manager', 'requirements-reviewer', 'tech-analyst', 'reviewer', 'bug-triager']);

function frontmatter(agent) {
  const chain = models[agent.model_class];
  const tools = readOnly.has(agent.name)
    ? ['read', 'grep', 'glob', 'web_search']
    : ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'web_search'];
  const lines = [
    '---',
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agent.description)}`,
    'model:',
    ...chain.map((m) => `  - ${m}`),
    `tools: [${tools.join(', ')}]`,
    'spawns: []',
    '---',
  ];
  return lines.join('\n');
}

export async function renderOmpAgents() {
  const { agents } = JSON.parse(await readFile(path.join(root, 'squad', 'agents', 'registry.json'), 'utf8'));
  return Object.fromEntries(
    agents.map((agent) => [
      `${agent.name}.md`,
      `# generated_from: squad/agents/registry.json\n${frontmatter(agent)}\n\n${instructions[agent.name]}\n`,
    ]),
  );
}
