import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAgentIndex } from './render-agent-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = await renderAgentIndex();
const actual = await readFile(path.join(root, 'squad', 'generated', 'agent-index.json'), 'utf8');
if (actual !== expected) { console.error('Generated agent index has drifted. Regenerate it with: node scripts/render-agent-index.mjs > squad/generated/agent-index.json'); process.exitCode = 1; }
else console.log('Generated artifacts have no drift.');
