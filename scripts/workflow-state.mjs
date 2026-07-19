import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const now = () => new Date().toISOString();
const stateFile = (runDir) => path.join(runDir, 'state.json');

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

export async function createRun(root, { runId, workflow = 'squad-feature', maxCycles = 2 } = {}) {
  if (!runId) throw new Error('runId is required');
  const runDir = path.join(root, '.workflow', 'runs', runId);
  await mkdir(runDir, { recursive: true });
  const state = { schema_version: '1.0', run_id: runId, workflow, status: 'active', phase: 'initialized', next_action: 'collect requirements', cycle: 0, max_cycles: maxCycles, updated_at: now(), artifacts: {}, reservations: {} };
  await atomicJson(stateFile(runDir), state);
  await writeFile(path.join(runDir, 'handoff.md'), `## Current Status\n\n- Phase: initialized\n\n## Next Agent\n\n- root\n\n## Decisions\n\n| ID | Decision | Rationale |\n|---|---|---|\n\n## Open Questions\n\n-\n`);
  await appendEvent(runDir, { type: 'run_initialized', phase: state.phase });
  return { runDir, state };
}

export async function readState(runDir) { return JSON.parse(await readFile(stateFile(runDir), 'utf8')); }

export async function appendEvent(runDir, event) {
  await appendFile(path.join(runDir, 'events.jsonl'), `${JSON.stringify({ timestamp: now(), ...event })}\n`);
}

export async function transition(runDir, patch) {
  const previous = await readState(runDir);
  const state = { ...previous, ...patch, updated_at: now() };
  await atomicJson(stateFile(runDir), state);
  await appendEvent(runDir, { type: 'state_transition', from: previous.phase, to: state.phase, status: state.status });
  return state;
}

export async function reserveFiles(runDir, worker, files) {
  const state = await readState(runDir); const requested = [...new Set(files)].sort();
  const conflicts = Object.entries(state.reservations ?? {}).filter(([owner, owned]) => owner !== worker && owned.some((file) => requested.includes(file)));
  if (conflicts.length) throw new Error(`write_scope conflict: ${conflicts.map(([owner]) => owner).join(', ')}`);
  await transition(runDir, { reservations: { ...(state.reservations ?? {}), [worker]: requested } });
  return requested;
}

export async function releaseFiles(runDir, worker) {
  const state = await readState(runDir); const reservations = { ...(state.reservations ?? {}) };
  delete reservations[worker]; return transition(runDir, { reservations });
}

if (process.argv[1]?.endsWith('workflow-state.mjs')) {
  const [command, root, runId] = process.argv.slice(2);
  if (command !== 'init' || !root || !runId) throw new Error('Usage: node scripts/workflow-state.mjs init <root> <run-id>');
  console.log(JSON.stringify(await createRun(root, { runId }), null, 2));
}
