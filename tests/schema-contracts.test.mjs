import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContractFixtures } from '../scripts/validate-fixtures.mjs';

test('schemas accept positive fixtures, reject invalid fixtures, and current targets match frozen snapshots', async () => {
  assert.deepEqual(await validateContractFixtures(), []);
});
