import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOmpTarget } from '../scripts/validate-omp-target.mjs';

test('OMP agents are generated from the canonical registry with F0-validated model chains', async () => {
  assert.deepEqual(await validateOmpTarget(), []);
});
