import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeManagedInstructions } from '../scripts/managed-instructions.mjs';
import { validateDevinTarget } from '../scripts/validate-devin-target.mjs';

test('Devin profiles follow model, fallback, and foreground safety policy', async () => {
  assert.deepEqual(await validateDevinTarget(), []);
});
test('managed Devin instructions preserve project content and are idempotent', () => {
  const block = '<!-- orchestrated-squad:devin:start -->\nmanaged\n<!-- orchestrated-squad:devin:end -->';
  const once = mergeManagedInstructions('# Existing project rule\n', block);
  assert.match(once, /Existing project rule/); assert.equal((once.match(/orchestrated-squad:devin:start/g) ?? []).length, 1);
  assert.equal(mergeManagedInstructions(once, block), once);
});
