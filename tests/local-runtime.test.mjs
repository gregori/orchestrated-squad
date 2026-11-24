import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const cli = path.resolve(import.meta.dirname, '..', 'scripts', 'squad.mjs');

async function installed(t, target = 'claude') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'squad-runtime-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@x', 'commit', '-q', '--allow-empty', '-m', 'b'], { cwd: root });
  await writeFile(path.join(root, 'package.json'), '{"scripts":{"test":"node -e 0"}}\n');
  const install = spawnSync(process.execPath, [cli, 'install', '--target', target, '--yes', '--dir', root], { encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  return root;
}

const local = (root, args, input, env = {}) => spawnSync(process.execPath, [path.join(root, '.squad', 'bin', 'squad.mjs'), ...args], { cwd: root, input, encoding: 'utf8', env: { ...process.env, ...env } });
const edit = (file) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: file } });
const shell = (command) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'exec', tool_input: { command } });

test('the installer copies a self-contained runtime that works without the package', async (t) => {
  const root = await installed(t);
  const version = JSON.parse(await readFile(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8')).version;
  assert.equal((await readFile(path.join(root, '.squad', 'bin', 'VERSION'), 'utf8')).trim(), version);
  assert.equal(local(root, ['state', 'init', 'r1']).status, 0);
  assert.equal(local(root, ['state', 'transition', 'r1', '--to', 'review']).status, 1);
  assert.equal(local(root, ['gate', 'r1']).status, 0);
  const manifest = JSON.parse(await readFile(path.join(root, '.squad', 'install-manifest.json'), 'utf8'));
  assert.ok(manifest.files['.squad/bin/squad.mjs'] && manifest.files['.squad/bin/workflows/debug.json']);
});

test('reinstalling does not duplicate hooks in merged settings', async (t) => {
  const root = await installed(t);
  spawnSync(process.execPath, [cli, 'install', '--target', 'claude', '--yes', '--dir', root]);
  const settings = JSON.parse(await readFile(path.join(root, '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.hooks.PreToolUse.length, 1);
});

test('phase-guard denies writes outside the allowlist only while a read-only phase is active', async (t) => {
  const root = await installed(t, 'devin');
  const env = { DEVIN_PROJECT_DIR: root };
  const guard = (payload) => local(root, ['hook', 'phase-guard'], payload, env);
  assert.equal(guard(edit('src/a.js')).status, 0); // sem run ativa
  assert.equal(local(root, ['state', 'init', 'd1', '--workflow', 'squad-debug']).status, 0);
  assert.equal(guard(edit('src/a.js')).status, 0); // initialized não tem allowlist
  assert.equal(local(root, ['state', 'transition', 'd1', '--to', 'diagnosis']).status, 0);
  const denied = guard(edit('src/a.js'));
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /phase 'diagnosis' of run 'd1' may only write \.workflow\//);
  assert.equal(guard(edit('.workflow/runs/d1/notes.md')).status, 0);
  assert.equal(guard(edit(path.join(root, '.workflow', 'x.md'))).status, 0); // caminho absoluto
  assert.equal(guard(shell('rm -rf src')).status, 2);
  assert.equal(guard(shell('git diff HEAD')).status, 0);
  assert.equal(guard(shell('node .squad/bin/squad.mjs state record d1 --artifact diagnosis --stdin')).status, 0);
  assert.equal(guard(shell('node .squad/bin/squad.mjs state status; rm x')).status, 2);
  assert.equal(local(root, ['state', 'transition', 'd1', '--to', 'blocked', '--reason', 'pausa']).status, 0);
  assert.equal(guard(edit('src/a.js')).status, 0); // run bloqueada não restringe
});

test('SQUAD_HOOK_LOG records hook calls without content', async (t) => {
  const root = await installed(t, 'devin');
  local(root, ['hook', 'phase-guard'], shell('ls'), { DEVIN_PROJECT_DIR: root, SQUAD_HOOK_LOG: '1' });
  const [line] = (await readFile(path.join(root, '.workflow', 'hook-log.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(line.hook, 'phase-guard');
  assert.equal(line.tool, 'exec');
  assert.equal(line.decision, 'allow');
  assert.ok(!('command' in line));
});

test('codex: global phase-guard and read-only agent hooks are installed, and apply_patch paths are checked', async (t) => {
  const root = await installed(t, 'codex');
  const hooks = JSON.parse(await readFile(path.join(root, '.codex', 'hooks.json'), 'utf8'));
  assert.match(hooks.hooks.PreToolUse[0].hooks[0].command, /hook phase-guard/);
  assert.match(await readFile(path.join(root, '.codex', 'agents', 'reviewer.toml'), 'utf8'), /hook read-only/);
  assert.doesNotMatch(await readFile(path.join(root, '.codex', 'agents', 'implementer.toml'), 'utf8'), /hook read-only/);
  assert.equal(local(root, ['state', 'init', 'd1', '--workflow', 'squad-debug']).status, 0);
  assert.equal(local(root, ['state', 'transition', 'd1', '--to', 'diagnosis']).status, 0);
  const patch = (file) => JSON.stringify({ hook_event_name: 'PreToolUse', cwd: path.join(root, 'src'), tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch\n` } });
  // sem variáveis de ambiente: a raiz vem do cwd do payload (Codex)
  const env = { DEVIN_PROJECT_DIR: '', CLAUDE_PROJECT_DIR: '' };
  const denied = local(root, ['hook', 'phase-guard'], patch('src/app.js'), env);
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /tried src\/app\.js/);
  assert.equal(local(root, ['hook', 'phase-guard'], patch('.workflow/runs/d1/notes.md'), env).status, 0);
  const bash = JSON.stringify({ hook_event_name: 'PreToolUse', cwd: root, tool_name: 'Bash', tool_input: { command: 'git checkout -- .' } });
  assert.equal(local(root, ['hook', 'phase-guard'], bash, env).status, 2);
});
