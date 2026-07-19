import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRun, reserveFiles, transition } from '../scripts/workflow-state.mjs';
import { runGate } from '../scripts/workflow-gates.mjs';
import { publishWorkItem } from '../scripts/work-item-publisher.mjs';

test('workflow state is versioned and deterministic gates persist structured results', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'squad-phase1-')); t.after(() => rm(root, { recursive: true, force: true }));
  const { runDir, state } = await createRun(root, { runId: 'run-001' });
  assert.equal(state.schema_version, '1.0');
  assert.equal((await transition(runDir, { phase: 'deterministic_checks', next_action: 'run lint' })).phase, 'deterministic_checks');
  await reserveFiles(runDir, 'implementer', ['src/app.js']);
  await assert.rejects(reserveFiles(runDir, 'sre', ['src/app.js']), /write_scope conflict/);
  assert.equal((await runGate({ root, runDir, gate: 'lint', command: 'node -e "process.exit(0)"' })).outcome, 'success');
  assert.equal((await runGate({ root, runDir, gate: 'test', command: 'node -e "process.exit(3)"' })).outcome, 'failed');
  const checks = JSON.parse(await readFile(path.join(runDir, 'checks.json'), 'utf8'));
  assert.deepEqual(checks.map((check) => check.evidence[0].exit_code), [0, 3]);
});

test('none work-item provider stores a local record without external action', async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'squad-work-item-')); t.after(() => rm(outputDir, { recursive: true, force: true }));
  const result = await publishWorkItem({ provider: 'none', input: { title: 'Local story', body: 'No tracker' }, outputDir });
  assert.equal(result.status, 'stored'); assert.equal(result.external_action, false);
  assert.equal(JSON.parse(await readFile(path.join(outputDir, 'publication.json'), 'utf8')).work_item.title, 'Local story');
});
