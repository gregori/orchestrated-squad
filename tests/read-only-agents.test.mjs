import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readOnlyHook, readOnlyReason } from '../scripts/agent-hooks.mjs';
import { readOnlyDrift } from '../scripts/check-drift.mjs';

const cli = path.resolve(import.meta.dirname, '..', 'scripts', 'squad.mjs');
const claude = (tool_name, tool_input = {}) => ({ hook_event_name: 'PreToolUse', tool_name, tool_input });

test('write tools are denied, read tools and TodoWrite are allowed', () => {
  for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'editFiles', 'createFile', 'apply_patch']) {
    assert.ok(readOnlyReason(claude(tool, { file_path: 'src/a.js' })), tool);
  }
  for (const tool of ['Read', 'Grep', 'Glob', 'TodoWrite', 'WebFetch', 'readFile', 'search']) {
    assert.equal(readOnlyReason(claude(tool)), null, tool);
  }
});

test('file-changing shell commands are denied, inspection commands are allowed', () => {
  const denied = ['echo x > src/a.js', 'cat a >> b', 'sed -i s/a/b/ f', 'rm -rf src', 'git commit -m x', 'git checkout -- .', 'npm install left-pad', 'tee out.txt', 'mkdir x', 'squad state transition r --to review'];
  const allowed = ['git diff main...HEAD', 'npm test 2>&1', 'node -e "1" > /dev/null', 'grep -rn foo src', 'git log --oneline -5', 'ls -la', 'npx -y @gregori/orchestrated-squad@latest state status'];
  for (const command of denied) assert.ok(readOnlyReason(claude('Bash', { command })), command);
  for (const command of allowed) assert.equal(readOnlyReason(claude('Bash', { command })), null, command);
  assert.ok(readOnlyReason({ toolName: 'runInTerminal', toolInput: { command: 'rm a' } })); // VS Code
});

test('the hook prints a PreToolUse deny decision, or nothing to allow', () => {
  const deny = readOnlyHook(JSON.stringify(claude('Write', { file_path: 'x' })));
  assert.equal(deny.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(deny.hookSpecificOutput.permissionDecisionReason, /squad state record/);
  assert.equal(readOnlyHook(JSON.stringify(claude('Read'))), null);
  assert.equal(readOnlyHook('not json'), null);
  const run = spawnSync(process.execPath, [cli, 'hook', 'read-only'], { input: JSON.stringify(claude('Edit')), encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.equal(JSON.parse(run.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allow = spawnSync(process.execPath, [cli, 'hook', 'read-only'], { input: JSON.stringify(claude('Grep')), encoding: 'utf8' });
  assert.equal(allow.stdout, '');
});

test('state record writes the artifact inside the run and registers it', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'squad-record-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args, '--dir', root], { input, encoding: 'utf8' });
  assert.equal(run(['state', 'init', 'r1']).status, 0);
  const recorded = run(['state', 'record', 'r1', '--artifact', 'review', '--stdin'], '## Findings\n- none\n');
  assert.equal(recorded.status, 0, recorded.stderr);
  assert.equal(await readFile(path.join(root, '.workflow', 'runs', 'r1', 'review.md'), 'utf8'), '## Findings\n- none\n');
  assert.equal(JSON.parse(run(['state', 'status', 'r1']).stdout).artifacts.review, '.workflow/runs/r1/review.md');
  assert.notEqual(run(['state', 'record', 'r1', '--artifact', 'review', '--stdin'], '   ').status, 0);
  assert.notEqual(run(['state', 'record', 'r1', '--artifact', '../escape', '--stdin'], 'x').status, 0);
});

test('read-only specialists have no write path in any runtime', async () => {
  assert.deepEqual(await readOnlyDrift(), []);
});
