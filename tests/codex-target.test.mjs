import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCodexTarget } from '../scripts/validate-codex-target.mjs';

test('Codex agents are generated from the canonical registry with safe permissions', async () => {
  assert.deepEqual(await validateCodexTarget(), []);
});
