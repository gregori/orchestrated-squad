import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { contributionPreview, disableTelemetry, exportTelemetry, recordTelemetry } from '../scripts/telemetry.mjs';

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
