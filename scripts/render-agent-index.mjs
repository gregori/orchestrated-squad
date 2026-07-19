import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function renderAgentIndex() {
  const registry = JSON.parse(await readFile(path.join(root, 'squad', 'agents', 'registry.json'), 'utf8'));
  return `${JSON.stringify({ schema_version: registry.schema_version, generated_from: 'squad/agents/registry.json', agents: registry.agents.map(({ name, model_class, write_scope }) => ({ name, model_class, write_scope })).sort((a, b) => a.name.localeCompare(b.name)) }, null, 2)}\n`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(await renderAgentIndex());
