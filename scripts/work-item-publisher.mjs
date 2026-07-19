import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argument = (name) => { const at = process.argv.indexOf(name); return at === -1 ? undefined : process.argv[at + 1]; };
export async function publishWorkItem({ provider, input, outputDir, publish = false }) {
  if (!['none', 'github', 'jira'].includes(provider)) throw new Error(`Unknown provider: ${provider}`);
  const item = typeof input === 'string' ? JSON.parse(await readFile(input, 'utf8')) : input;
  if (!item.title) throw new Error('Work item must include title');
  let result;
  if (provider === 'none') result = { provider, status: 'stored', external_action: false, reference: null };
  else if (provider === 'github') result = { provider, status: publish ? 'blocked' : 'planned', external_action: publish, command: `gh issue create --title ${JSON.stringify(item.title)}`, reason: publish ? 'GitHub publication requires the future authenticated adapter.' : 'Use --publish only after explicit confirmation.' };
  else result = { provider, status: publish ? 'blocked' : 'planned', external_action: publish, payload: { fields: { summary: item.title, description: item.body ?? '' } }, reason: publish ? 'Jira publication requires the future configured adapter.' : 'Use --publish only after explicit confirmation.' };
  await mkdir(outputDir, { recursive: true });
  const record = { schema_version: '1.0', work_item: item, ...result };
  await writeFile(path.join(outputDir, 'publication.json'), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
if (process.argv[1]?.endsWith('work-item-publisher.mjs')) {
  const provider = argument('--provider') ?? 'none'; const input = argument('--input'); const outputDir = argument('--output') ?? process.cwd();
  if (!input) throw new Error('Usage: node scripts/work-item-publisher.mjs --provider none|github|jira --input <item.json> [--output <dir>] [--publish]');
  console.log(JSON.stringify(await publishWorkItem({ provider, input, outputDir, publish: process.argv.includes('--publish') }), null, 2));
}
