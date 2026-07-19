import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { discoverProject } from '../scripts/project-discovery.mjs';

const fixture = (...parts) => path.join(import.meta.dirname, 'fixtures', 'discovery', ...parts);
test('discovery detects Node, Python, polyglot and unknown fixtures without running commands', async () => {
  assert.deepEqual((await discoverProject(fixture('python'))).languages, ['python']);
  assert.deepEqual((await discoverProject(fixture('node'))).languages, ['node']);
  assert.deepEqual((await discoverProject(fixture('polyglot'))).languages, ['node', 'python']);
  const unknown = await discoverProject(fixture('unknown'));
  assert.equal(unknown.confidence, 'unknown'); assert.equal(unknown.questions.length, 1);
});
