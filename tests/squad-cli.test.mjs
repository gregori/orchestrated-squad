import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { createRun, readState } from '../scripts/workflow-state.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'scripts', 'squad.mjs');
async function temporary() { return mkdtemp(path.join(tmpdir(), 'squad-cli-')); }
function run(dir, ...args) { return spawnSync(process.execPath, [cli, ...args, '--dir', dir], { encoding: 'utf8' }); }

test('install is idempotent and records only installed files', async () => {
  const dir = await temporary();
  try {
    assert.equal(run(dir, 'install', '--target', 'codex', '--yes').status, 0);
    const manifest = JSON.parse(await readFile(path.join(dir, '.squad', 'install-manifest.json')));
    assert.ok(manifest.files['.codex/config.toml']);
    assert.ok(await stat(path.join(dir, '.agents', 'skills', 'squad-init', 'SKILL.md')));
    assert.match(await readFile(path.join(dir, 'AGENTS.md'), 'utf8'), /orchestrated-squad:codex:start/);
    assert.equal(run(dir, 'install', '--target', 'codex', '--yes').status, 0);
    assert.ok(await readFile(path.join(dir, '.squad', 'config.yaml'), 'utf8'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('dry-run does not write and no-init skips bootstrap artifacts', async () => {
  const dir = await temporary();
  try {
    assert.equal(run(dir, 'install', '--target', 'devin', '--dry-run', '--no-init', '--yes').status, 0);
    await assert.rejects(readFile(path.join(dir, '.squad', 'config.yaml')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('uninstall preserves user-modified artifact files', async () => {
  const dir = await temporary();
  try {
    assert.equal(run(dir, 'install', '--target', 'codex', '--yes').status, 0);
    const file = path.join(dir, '.codex', 'config.toml');
    await writeFile(file, '# user configuration\n');
    assert.equal(run(dir, 'uninstall').status, 0);
    assert.equal(await readFile(file, 'utf8'), '# user configuration\n');
    await assert.rejects(readFile(path.join(dir, 'AGENTS.md')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('all runtime targets install together and preserve resumable workflow state', async () => {
  const dir = await temporary();
  try {
    assert.equal(run(dir, 'install', '--target', 'all', '--yes', '--no-init').status, 0);
    for (const artifact of ['.codex/agents', '.claude/agents', '.opencode/agents', '.devin/agents', '.github/agents']) assert.ok((await stat(path.join(dir, artifact))).isDirectory());
    for (const artifact of ['.claude/skills/squad-yolo/SKILL.md', '.opencode/commands/squad-yolo.md', '.github/skills/squad-status/SKILL.md', '.agents/skills/squad-resume/SKILL.md']) assert.ok((await stat(path.join(dir, artifact))).isFile());
    assert.match(await readFile(path.join(dir, '.claude', 'skills', 'squad-status', 'SKILL.md'), 'utf8'), /no gates have run yet/);
    const { runDir } = await createRun(dir, { runId: 'cross-runtime' });
    assert.equal((await readState(runDir)).run_id, 'cross-runtime');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
