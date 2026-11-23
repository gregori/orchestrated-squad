import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = () => new Date().toISOString();
const stateFile = (runDir) => path.join(runDir, 'state.json');

/** Recusa de transição: o guard explica o motivo em linguagem legível. */
export class TransitionError extends Error {
  constructor(reasons) {
    super(`transition refused: ${reasons.join('; ')}`);
    this.name = 'TransitionError';
    this.reasons = reasons;
  }
}

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

const workflowFiles = { 'squad-feature': 'feature.json', 'squad-plan': 'feature.json', 'squad-execute': 'feature.json', 'squad-debug': 'debug.json' };

/** Definição do workflow (grafo de fases e pré-condições) ou null se não houver. */
export async function loadWorkflow(id) {
  const file = workflowFiles[id];
  return file ? JSON.parse(await readFile(path.join(packageRoot, 'squad', 'workflows', file), 'utf8')) : null;
}

function gitHead(root) {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

export async function fileHash(file) {
  try { return createHash('sha256').update(await readFile(file)).digest('hex'); } catch { return 'missing'; }
}

/** Arquivos já alterados (em relação a `base`) e seus hashes. `.workflow/` e `.squad/` ficam de fora. */
async function dirtyBaseline(root, base = null) {
  const { changedFiles } = await import('./scope-check.mjs');
  const files = changedFiles(root, base) ?? [];
  const baseline = {};
  for (const file of files.slice(0, 5000)) baseline[file] = await fileHash(path.join(root, file));
  return baseline;
}

const projectRoot = (runDir) => path.resolve(runDir, '..', '..', '..');

/** Foto do repositório ao entrar numa fase com `write_allowlist`. */
async function phaseEntry(runDir, phase) {
  const root = projectRoot(runDir);
  const head = gitHead(root);
  return { phase, head, dirty: await dirtyBaseline(root, head || null) };
}

/** Arquivos alterados desde a entrada na fase, comparando com a foto. */
export async function changedSincePhaseEntry(runDir, entry) {
  const { changedFiles } = await import('./scope-check.mjs');
  const root = projectRoot(runDir);
  const now = changedFiles(root, entry.head || null) ?? [];
  const candidates = new Set([...now, ...Object.keys(entry.dirty ?? {})]);
  const changed = [];
  for (const file of candidates) {
    const before = entry.dirty?.[file];
    const current = now.includes(file) ? await fileHash(path.join(root, file)) : null;
    if (before === undefined && current !== null) changed.push(file); // passou a diferir do HEAD
    else if (before !== undefined && current !== before) changed.push(file); // mudou ou foi revertido
  }
  return changed.sort();
}

export async function createRun(root, { runId, workflow = 'squad-feature', maxCycles = 2 } = {}) {
  if (!runId) throw new Error('runId is required');
  const runDir = path.join(root, '.workflow', 'runs', runId);
  await mkdir(runDir, { recursive: true });
  const state = { schema_version: '1.0', run_id: runId, workflow, status: 'active', phase: 'initialized', next_action: 'collect requirements', cycle: 0, max_cycles: maxCycles, updated_at: now(), base_ref: gitHead(root), baseline: await dirtyBaseline(root), artifacts: {}, reservations: {} };
  await atomicJson(stateFile(runDir), state);
  await writeFile(path.join(runDir, 'handoff.md'), `## Current Status\n\n- Phase: initialized\n\n## Next Agent\n\n- root\n\n## Decisions\n\n| ID | Decision | Rationale |\n|---|---|---|\n\n## Open Questions\n\n-\n`);
  await appendEvent(runDir, { type: 'run_initialized', phase: state.phase });
  return { runDir, state };
}

export async function readState(runDir) { return JSON.parse(await readFile(stateFile(runDir), 'utf8')); }

export async function readEvents(runDir) {
  try {
    return (await readFile(path.join(runDir, 'events.jsonl'), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch { return []; }
}

export async function appendEvent(runDir, event) {
  await appendFile(path.join(runDir, 'events.jsonl'), `${JSON.stringify({ timestamp: now(), ...event })}\n`);
}

// ------------------------------------------------------------ pré-condições
/** Momento da última entrada em `implementation`: gates anteriores a ele estão vencidos. */
async function lastImplementationAt(runDir) {
  const entries = (await readEvents(runDir)).filter((event) => event.type === 'state_transition' && event.to === 'implementation');
  return entries.length ? entries.at(-1).timestamp : null;
}

const preconditions = {
  async gates_passed(runDir, state, workflow) {
    const required = workflow.required_gates ?? [];
    const checks = await readJson(path.join(runDir, 'checks.json'), []);
    const since = await lastImplementationAt(runDir);
    const reasons = [];
    for (const gate of required) {
      const latest = checks.filter((check) => check.gate === gate).at(-1);
      if (!latest) reasons.push(`required gate '${gate}' has not run`);
      else if (since && (latest.completed_at ?? '') < since) reasons.push(`required gate '${gate}' is older than the last implementation`);
      else if (latest.outcome !== 'passed') reasons.push(`required gate '${gate}' is ${latest.outcome}`);
    }
    for (const check of checks) {
      if (check.blocking && check.outcome !== 'passed' && !required.includes(check.gate)) {
        const latest = checks.filter((other) => other.gate === check.gate).at(-1);
        if (latest === check && (!since || (check.completed_at ?? '') >= since)) reasons.push(`blocking gate '${check.gate}' is ${check.outcome}`);
      }
    }
    return reasons;
  },
  async review_recorded(runDir, state) {
    return state.artifacts?.review ? [] : ['independent review result is not recorded (artifact `review`)'];
  },
  async diagnosis_recorded(runDir, state) {
    return state.artifacts?.diagnosis ? [] : ['diagnosis is not recorded (artifact `diagnosis`)'];
  },
};

/** Motivos pelos quais `patch` não pode ser aplicado; lista vazia = permitido. */
export async function checkTransition(runDir, previous, patch) {
  const to = patch.phase ?? previous.phase;
  const from = previous.phase;
  if (to === from) return [];
  if (previous.status === 'complete') return ['run is complete'];
  if (to === 'blocked') return patch.blocked_reason ? [] : ['blocking a run requires a reason'];
  if (from === 'blocked') {
    return to === previous.blocked_from ? [] : [`a blocked run resumes only to '${previous.blocked_from}'`];
  }
  const workflow = await loadWorkflow(previous.workflow);
  if (!workflow?.transitions) return [];
  const allowed = workflow.transitions[from] ?? [];
  if (!allowed.includes(to)) return [`'${from}' → '${to}' is not allowed (allowed: ${allowed.join(', ') || 'none'})`];
  const reasons = [];
  const allowlist = workflow.write_allowlist?.[from];
  if (allowlist && previous.phase_entry?.phase === from) {
    const { covered } = await import('./scope-check.mjs');
    const outside = (await changedSincePhaseEntry(runDir, previous.phase_entry)).filter((file) => !allowlist.some((entry) => covered(file, entry)));
    if (outside.length) reasons.push(`phase '${from}' may only write ${allowlist.join(', ')}; changed: ${outside.slice(0, 10).join(', ')}${outside.length > 10 ? ' …' : ''}`);
  }
  const isCycle = (workflow.cycle_transitions ?? []).some(([a, b]) => a === from && b === to);
  if (isCycle && previous.cycle + 1 > previous.max_cycles) {
    reasons.push(`cycle limit reached (${previous.max_cycles}); move the run to 'blocked' with a reason`);
  }
  for (const name of workflow.preconditions?.[to] ?? []) {
    reasons.push(...(await preconditions[name](runDir, previous, workflow)));
  }
  return reasons;
}

/**
 * Único caminho para alterar o estado de uma run. Valida a transição contra o
 * grafo do workflow e as pré-condições determinísticas; recusa com TransitionError.
 */
export async function transition(runDir, patch) {
  const previous = await readState(runDir);
  const reasons = await checkTransition(runDir, previous, patch);
  if (reasons.length) {
    await appendEvent(runDir, { type: 'transition_refused', from: previous.phase, to: patch.phase ?? previous.phase, reasons });
    throw new TransitionError(reasons);
  }
  const workflow = await loadWorkflow(previous.workflow);
  const to = patch.phase ?? previous.phase;
  const state = { ...previous, ...patch, updated_at: now() };
  if (to === 'blocked' && previous.phase !== 'blocked') { state.status = 'blocked'; state.blocked_from = previous.phase; }
  if (previous.phase === 'blocked' && to !== 'blocked') { state.status = 'active'; delete state.blocked_from; delete state.blocked_reason; }
  if (to === 'complete') state.status = 'complete';
  if ((workflow?.cycle_transitions ?? []).some(([a, b]) => a === previous.phase && b === to)) state.cycle = previous.cycle + 1;
  if (to !== previous.phase) {
    const resuming = previous.phase === 'blocked' && previous.phase_entry?.phase === to;
    if (resuming || to === 'blocked') { /* mantém a foto da fase interrompida */ }
    else if (workflow?.write_allowlist?.[to]) state.phase_entry = await phaseEntry(runDir, to);
    else delete state.phase_entry;
  }
  await atomicJson(stateFile(runDir), state);
  await appendEvent(runDir, { type: 'state_transition', from: previous.phase, to: state.phase, status: state.status });
  return state;
}

/** Atualiza campos que não mudam de fase (próxima ação, artefatos), sem passar pelo grafo. */
export async function annotate(runDir, { next_action, artifacts } = {}) {
  const previous = await readState(runDir);
  const state = { ...previous, updated_at: now() };
  if (next_action) state.next_action = next_action;
  if (artifacts) state.artifacts = { ...(previous.artifacts ?? {}), ...artifacts };
  await atomicJson(stateFile(runDir), state);
  await appendEvent(runDir, { type: 'state_annotated', fields: Object.keys({ ...(next_action ? { next_action } : {}), ...(artifacts ?? {}) }) });
  return state;
}

async function writeReservations(runDir, reservations) {
  const state = { ...(await readState(runDir)), reservations, updated_at: now() };
  await atomicJson(stateFile(runDir), state);
  await appendEvent(runDir, { type: 'reservations_changed', workers: Object.keys(reservations) });
  return state;
}

export async function reserveFiles(runDir, worker, files) {
  const state = await readState(runDir); const requested = [...new Set(files)].sort();
  const conflicts = Object.entries(state.reservations ?? {}).filter(([owner, owned]) => owner !== worker && owned.some((file) => requested.includes(file)));
  if (conflicts.length) throw new Error(`write_scope conflict: ${conflicts.map(([owner]) => owner).join(', ')}`);
  await writeReservations(runDir, { ...(state.reservations ?? {}), [worker]: requested });
  return requested;
}

export async function releaseFiles(runDir, worker) {
  const state = await readState(runDir); const reservations = { ...(state.reservations ?? {}) };
  delete reservations[worker]; return writeReservations(runDir, reservations);
}

if (process.argv[1]?.endsWith('workflow-state.mjs')) {
  const [command, root, runId] = process.argv.slice(2);
  if (command !== 'init' || !root || !runId) throw new Error('Usage: node scripts/workflow-state.mjs init <root> <run-id> (prefer: squad state init)');
  console.log(JSON.stringify(await createRun(root, { runId }), null, 2));
}
