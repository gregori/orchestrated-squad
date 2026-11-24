import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runConfiguredGates } from './gate-runner.mjs';
import { annotate, checkTransition, createRun, readState, releaseFiles, reserveFiles, transition, TransitionError } from './workflow-state.mjs';

export const RUN_COMMANDS = ['state', 'gate', 'hook'];

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export function runUsage() {
  return `Run state (the only supported way to change .workflow/runs/<run-id>/state.json):
  squad state init <run-id> [--workflow squad-feature]
  squad state status [<run-id>]
  squad state check <run-id> --to <phase>
  squad state transition <run-id> --to <phase> --next "<next action>" [--reason "<why blocked>"]
  squad state annotate <run-id> [--next "<next action>"] [--artifact <name>=<path>]
  squad state record <run-id> --artifact <name> (--file <path> | --stdin)
      writes .workflow/runs/<run-id>/<name>.md and records it (for read-only specialists' output)
  squad state reserve <run-id> --worker <name> --files <a,b,src/>
  squad state release <run-id> --worker <name>

Deterministic gates (commands come from .squad/config.yaml, never from the agent):
  squad gate <run-id> [--gates lint,test,scope]

Agent hooks (deny writes for read-only specialists; reads the hook payload on stdin):
  squad hook read-only

Common option: --dir <project> (default: current directory)`;
}

function parse(values) {
  const args = { positional: [], artifacts: {}, dir: process.cwd() };
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const take = () => values[++i];
    if (value === '--dir') args.dir = path.resolve(take() ?? '');
    else if (value === '--to') args.to = take();
    else if (value === '--next') args.next = take();
    else if (value === '--reason') args.reason = take();
    else if (value === '--workflow') args.workflow = take();
    else if (value === '--file') args.file = take();
    else if (value === '--stdin') args.stdin = true;
    else if (value === '--worker') args.worker = take();
    else if (value === '--files') args.files = (take() ?? '').split(',').map((f) => f.trim()).filter(Boolean);
    else if (value === '--gates') args.gates = (take() ?? '').split(',').map((g) => g.trim()).filter(Boolean);
    else if (value === '--artifact') { const [name, ...rest] = (take() ?? '').split('='); args.artifacts[name] = rest.join('='); args.artifactName = name; }
    else if (value.startsWith('--')) throw new Error(`Unknown option: ${value}`);
    else args.positional.push(value);
  }
  return args;
}

const runDirOf = (dir, runId) => path.join(dir, '.workflow', 'runs', runId);

async function latestActiveRun(dir) {
  const base = path.join(dir, '.workflow', 'runs');
  let names = [];
  try { names = await readdir(base); } catch { return null; }
  const runs = [];
  for (const name of names) {
    try {
      const state = await readState(path.join(base, name));
      if (state.status !== 'complete') runs.push({ name, updated: (await stat(path.join(base, name, 'state.json'))).mtimeMs });
    } catch { /* not a run */ }
  }
  return runs.sort((a, b) => b.updated - a.updated)[0]?.name ?? null;
}

function requireRun(args) {
  const runId = args.positional[0];
  if (!runId) throw new Error('run id is required');
  return runId;
}

/** Executa `squad state ...` / `squad gate ...`; retorna { result, exitCode }. */
export async function runCommand(command, values) {
  const args = parse(values);
  if (command === 'hook') {
    const { readOnlyHook } = await import('./agent-hooks.mjs');
    if (args.positional[0] !== 'read-only') throw new Error('Usage: squad hook read-only');
    const output = readOnlyHook(await readStdin());
    return { result: output, exitCode: 0 };
  }
  if (command === 'gate') {
    const runId = requireRun(args);
    const result = await runConfiguredGates({ root: args.dir, runDir: runDirOf(args.dir, runId), gates: args.gates });
    return { result, exitCode: result.outcome === 'passed' ? 0 : 1 };
  }
  const action = args.positional.shift();
  if (action === 'init') {
    const { state } = await createRun(args.dir, { runId: requireRun(args), workflow: args.workflow });
    return { result: state, exitCode: 0 };
  }
  if (action === 'status') {
    const runId = args.positional[0] ?? await latestActiveRun(args.dir);
    if (!runId) return { result: { status: 'no active run' }, exitCode: 0 };
    return { result: await readState(runDirOf(args.dir, runId)), exitCode: 0 };
  }
  const runId = requireRun(args);
  const runDir = runDirOf(args.dir, runId);
  if (action === 'check') {
    if (!args.to) throw new Error('--to is required');
    const reasons = await checkTransition(runDir, await readState(runDir), { phase: args.to });
    return { result: { allowed: reasons.length === 0, reasons }, exitCode: reasons.length ? 1 : 0 };
  }
  if (action === 'transition') {
    if (!args.to) throw new Error('--to is required');
    const patch = { phase: args.to };
    if (args.next) patch.next_action = args.next;
    if (args.reason) patch.blocked_reason = args.reason;
    try {
      return { result: await transition(runDir, patch), exitCode: 0 };
    } catch (error) {
      if (error instanceof TransitionError) return { result: { refused: true, reasons: error.reasons }, exitCode: 1 };
      throw error;
    }
  }
  if (action === 'record') {
    const name = args.artifactName;
    if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('--artifact <name> is required (lowercase letters, digits and dashes)');
    if (!args.file && !args.stdin) throw new Error('--file <path> or --stdin is required');
    const content = args.stdin ? await readStdin() : await readFile(path.resolve(args.dir, args.file), 'utf8');
    if (!content.trim()) throw new Error('refusing to record an empty artifact');
    const relative = path.join('.workflow', 'runs', runId, `${name}.md`);
    await writeFile(path.join(args.dir, relative), content.endsWith('\n') ? content : `${content}\n`);
    const state = await annotate(runDir, { artifacts: { [name]: relative.split(path.sep).join('/') } });
    return { result: { recorded: relative, artifacts: state.artifacts }, exitCode: 0 };
  }
  if (action === 'annotate') {
    return { result: await annotate(runDir, { next_action: args.next, artifacts: Object.keys(args.artifacts).length ? args.artifacts : undefined }), exitCode: 0 };
  }
  if (action === 'reserve') {
    if (!args.worker || !args.files?.length) throw new Error('--worker and --files are required');
    return { result: { worker: args.worker, reserved: await reserveFiles(runDir, args.worker, args.files) }, exitCode: 0 };
  }
  if (action === 'release') {
    if (!args.worker) throw new Error('--worker is required');
    return { result: (await releaseFiles(runDir, args.worker)).reservations, exitCode: 0 };
  }
  throw new Error(`Unknown state action: ${action ?? '(none)'}\n${runUsage()}`);
}
