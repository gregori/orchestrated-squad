import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { contributeTelemetry, contributionPreview, disableTelemetry, exportTelemetry, recordTelemetry } from '../scripts/telemetry.mjs';

test('telemetry remains local and redacts sensitive fields', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'squad-telemetry-'));
  try {
    assert.equal(await recordTelemetry(root, { runtime: 'codex', duration_ms: 12, prompt: 'never persist', absolute_path: 'C:\\secret' }), true);
    const event = (await exportTelemetry(root)).events[0];
    assert.equal(event.runtime, 'codex'); assert.equal(event.duration_ms, 12);
    assert.equal('prompt' in event, false); assert.equal('absolute_path' in event, false); assert.equal('recorded_at' in event, false);
    await disableTelemetry(root);
    assert.equal(await recordTelemetry(root, { runtime: 'claude' }), false);
    assert.ok(await readFile(path.join(root, '.squad', 'telemetry', 'settings.json')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('telemetry contribution requires at least five aggregated runs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'squad-telemetry-'));
  try {
    await assert.rejects(contributionPreview(root), /five runs/);
    for (let index = 0; index < 5; index += 1) await recordTelemetry(root, { runtime: 'codex', result: 'pass' });
    assert.equal((await contributionPreview(root)).runs, 5);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('telemetry contribution opens a pull request with only sanitized aggregate data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'squad-telemetry-'));
  const calls = [];
  const run = async (command, args) => {
    calls.push({ command, args });
    if (args.includes('--jq')) return { stdout: args.at(-1) === '.default_branch' ? 'main\n' : 'base-sha\n' };
    if (args[0] === 'pr') return { stdout: 'https://github.com/gregori/orchestrated-squad-metrics/pull/1\n' };
    return { stdout: '' };
  };
  try {
    for (let index = 0; index < 5; index += 1) await recordTelemetry(root, { runtime: 'codex', prompt: 'never publish' });
    const result = await contributeTelemetry(root, { run });
    assert.equal(result.repository, 'gregori/orchestrated-squad-metrics');
    assert.match(result.pull_request, /pull\/1$/);
    assert.equal(calls.at(-1).args[0], 'pr');
    const upload = calls.find((call) => call.args.includes('PUT'));
    const content = upload.args.find((arg) => arg.startsWith('content=')).slice(8);
    assert.equal(Buffer.from(content, 'base64').toString().includes('never publish'), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
