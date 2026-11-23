import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRun, readState, reserveFiles, transition, TransitionError, annotate } from '../scripts/workflow-state.mjs';
import { readGateConfig, runConfiguredGates } from '../scripts/gate-runner.mjs';
import { covered } from '../scripts/scope-check.mjs';
import { modelDrift } from '../scripts/check-drift.mjs';

const cli = path.resolve(import.meta.dirname, '..', 'scripts', 'squad.mjs');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });

async function project(t, { gates = { test: 'node -e "process.exit(0)"' } } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'squad-guard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '--allow-empty', '-m', 'base');
  await mkdir(path.join(root, '.squad'));
  const body = Object.entries(gates).map(([name, command]) => `  ${name}:\n    command: "${command}"\n    blocking: true`).join('\n');
  await writeFile(path.join(root, '.squad', 'config.yaml'), `schema_version: 1.0\ngates:\n${body}\nwork_items:\n  provider: none\n`);
  return root;
}

async function walk(runDir, ...phases) {
  for (const phase of phases) await transition(runDir, { phase, next_action: `do ${phase}` });
}

test('the phase graph refuses skipped phases', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'r1' });
  await assert.rejects(transition(runDir, { phase: 'implementation' }), (error) => error instanceof TransitionError && /not allowed/.test(error.reasons[0]));
  await walk(runDir, 'requirements', 'requirements_review', 'design', 'planned', 'implementation');
  assert.equal((await readState(runDir)).phase, 'implementation');
  const events = (await readFile(path.join(runDir, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(events.some((event) => event.type === 'transition_refused'));
});

test('review requires fresh passing gates, including scope', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'r2' });
  await walk(runDir, 'requirements', 'requirements_review', 'design', 'planned', 'implementation', 'deterministic_checks');
  await assert.rejects(transition(runDir, { phase: 'review' }), /required gate 'test' has not run/);

  await reserveFiles(runDir, 'implementer', ['src/']);
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'app.js'), 'ok\n');
  await writeFile(path.join(root, 'README.md'), 'fora do escopo\n');
  const blocked = await runConfiguredGates({ root, runDir });
  assert.equal(blocked.outcome, 'blocked');
  assert.equal(blocked.blocked_by, 'scope');
  assert.match(blocked.results.at(-1).output, /README\.md/);
  await assert.rejects(transition(runDir, { phase: 'review' }), /'scope' is failed/);

  await rm(path.join(root, 'README.md'));
  assert.equal((await runConfiguredGates({ root, runDir })).outcome, 'passed');
  await transition(runDir, { phase: 'review' });

  // nova implementação torna os gates antigos vencidos
  await walk(runDir, 'implementation', 'deterministic_checks');
  await assert.rejects(transition(runDir, { phase: 'review' }), /older than the last implementation/);
});

test('a required gate without a command blocks instead of being skipped', async (t) => {
  const root = await project(t, { gates: { lint: 'node -e "process.exit(0)"' } });
  const { runDir } = await createRun(root, { runId: 'r3' });
  const result = await runConfiguredGates({ root, runDir });
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.blocked_by, 'test');
  assert.equal(result.results.find((r) => r.gate === 'test').outcome, 'blocked');
});

test('cycle limit forces the run to blocked, and blocked resumes only where it stopped', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'r4' });
  await reserveFiles(runDir, 'implementer', ['src/']);
  await walk(runDir, 'requirements', 'requirements_review', 'design', 'planned', 'implementation', 'deterministic_checks');
  for (let cycle = 1; cycle <= 2; cycle += 1) {
    await runConfiguredGates({ root, runDir });
    await walk(runDir, 'review', 'implementation', 'deterministic_checks');
    assert.equal((await readState(runDir)).cycle, cycle);
  }
  await runConfiguredGates({ root, runDir });
  await transition(runDir, { phase: 'review' });
  await assert.rejects(transition(runDir, { phase: 'implementation' }), /cycle limit/);
  await assert.rejects(transition(runDir, { phase: 'blocked' }), /requires a reason/);
  const blocked = await transition(runDir, { phase: 'blocked', blocked_reason: 'reviewer and implementer disagree' });
  assert.equal(blocked.status, 'blocked');
  await assert.rejects(transition(runDir, { phase: 'verification' }), /resumes only to 'review'/);
  assert.equal((await transition(runDir, { phase: 'review' })).status, 'active');
});

test('finishing requires a recorded review', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'r5' });
  await walk(runDir, 'requirements', 'requirements_review', 'design', 'planned', 'implementation', 'deterministic_checks');
  await runConfiguredGates({ root, runDir });
  await transition(runDir, { phase: 'review' });
  await assert.rejects(transition(runDir, { phase: 'verification' }), /review result is not recorded/);
  await annotate(runDir, { artifacts: { review: '.workflow/runs/r5/review.md' } });
  await walk(runDir, 'verification', 'ready_to_finish', 'complete');
  assert.equal((await readState(runDir)).status, 'complete');
  await assert.rejects(transition(runDir, { phase: 'blocked', blocked_reason: 'x' }), /run is complete/);
});

test('squad CLI exposes the guard: a refused resume explains why', async (t) => {
  const root = await project(t);
  const run = (...args) => spawnSync(process.execPath, [cli, ...args, '--dir', root], { encoding: 'utf8' });
  assert.equal(run('state', 'init', 'r6').status, 0);
  const refused = run('state', 'transition', 'r6', '--to', 'review', '--next', 'review');
  assert.equal(refused.status, 1);
  assert.match(JSON.parse(refused.stdout).reasons[0], /not allowed/);
  const check = JSON.parse(run('state', 'check', 'r6', '--to', 'requirements').stdout);
  assert.equal(check.allowed, true);
  assert.equal(run('state', 'transition', 'r6', '--to', 'requirements', '--next', 'collect').status, 0);
  assert.equal(JSON.parse(run('state', 'status').stdout).phase, 'requirements');
  const gate = run('gate', 'r6');
  assert.equal(gate.status, 0, gate.stdout + gate.stderr);
});

test('gate config parser reads the installer format', async (t) => {
  const root = await project(t, { gates: { lint: 'npm run lint', test: 'npm test' } });
  assert.deepEqual(await readGateConfig(root), { lint: { command: 'npm run lint', blocking: true }, test: { command: 'npm test', blocking: true } });
});

test('reservations cover exact files, folders and prefixes', () => {
  assert.ok(covered('src/a/b.js', 'src/'));
  assert.ok(covered('src/a/b.js', 'src/**'));
  assert.ok(covered('docs/x.md', 'docs/*'));
  assert.ok(covered('package.json', 'package.json'));
  assert.ok(!covered('srcx/a.js', 'src/'));
});

test('Claude agent models match the canonical model classes', async () => {
  assert.deepEqual(await modelDrift(), []);
});

test('files already dirty when the run starts are not charged to the run unless they change', async (t) => {
  const root = await project(t);
  await writeFile(path.join(root, 'preexisting.txt'), 'antes\n');
  const { runDir } = await createRun(root, { runId: 'r7' });
  assert.equal((await runConfiguredGates({ root, runDir })).outcome, 'passed');
  await writeFile(path.join(root, 'preexisting.txt'), 'depois\n');
  const result = await runConfiguredGates({ root, runDir });
  assert.equal(result.blocked_by, 'scope');
  assert.match(result.results.at(-1).output, /preexisting\.txt/);
});

test('squad-debug has its own phase graph and requires a recorded diagnosis', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'd1', workflow: 'squad-debug' });
  await assert.rejects(transition(runDir, { phase: 'complete' }), /not allowed/);
  await transition(runDir, { phase: 'diagnosis' });
  await assert.rejects(transition(runDir, { phase: 'diagnosed' }), /diagnosis is not recorded/);
  await annotate(runDir, { artifacts: { diagnosis: '.workflow/runs/d1/diagnosis.md' } });
  await writeFile(path.join(runDir, 'diagnosis.md'), 'causa provável\n'); // .workflow/ é permitido
  await transition(runDir, { phase: 'diagnosed' });
  assert.equal((await transition(runDir, { phase: 'complete' })).status, 'complete');
});

test('read-only phases refuse to advance when files outside the allowlist changed', async (t) => {
  const root = await project(t);
  await writeFile(path.join(root, 'dirty-before.txt'), 'x\n');
  const { runDir } = await createRun(root, { runId: 'd2', workflow: 'squad-debug' });
  await transition(runDir, { phase: 'diagnosis' });
  await annotate(runDir, { artifacts: { diagnosis: 'd.md' } });
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'fix.js'), 'consertei sem pedir\n');
  await assert.rejects(transition(runDir, { phase: 'diagnosed' }), /may only write \.workflow\/; changed: src\/fix\.js/);
  // bloquear e voltar não apaga a evidência
  await transition(runDir, { phase: 'blocked', blocked_reason: 'edição fora do escopo' });
  await transition(runDir, { phase: 'diagnosis' });
  await assert.rejects(transition(runDir, { phase: 'diagnosed' }), /src\/fix\.js/);
  await rm(path.join(root, 'src'), { recursive: true });
  await transition(runDir, { phase: 'diagnosed' }); // o arquivo sujo de antes não conta
});

test('the reviewer phase of squad-feature is read-only too', async (t) => {
  const root = await project(t);
  const { runDir } = await createRun(root, { runId: 'f1' });
  await reserveFiles(runDir, 'implementer', ['src/']);
  await walk(runDir, 'requirements', 'requirements_review', 'design', 'planned', 'implementation', 'deterministic_checks');
  await runConfiguredGates({ root, runDir });
  await transition(runDir, { phase: 'review' });
  await annotate(runDir, { artifacts: { review: 'r.md' } });
  await writeFile(path.join(root, 'patched-by-reviewer.js'), 'x\n');
  await assert.rejects(transition(runDir, { phase: 'verification' }), /phase 'review' may only write/);
});
