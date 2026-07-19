import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appendEvent } from './workflow-state.mjs';

function argument(name) { const at = process.argv.indexOf(name); return at === -1 ? undefined : process.argv[at + 1]; }
function execute(command, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, windowsHide: true }); let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, output: output.trim() }));
  });
}
export async function runGate({ root, runDir, gate, command }) {
  if (!command) throw new Error('A deterministic command is required for this gate');
  const startedAt = new Date().toISOString(); const execution = await execute(command, root);
  const result = { schema_version: '1.0', agent: gate === 'lint' ? 'linter' : gate === 'test' ? 'test-runner' : 'gate-runner', outcome: execution.exitCode === 0 ? 'success' : 'failed', summary: execution.exitCode === 0 ? `${gate} passed` : `${gate} failed`, evidence: [{ command, exit_code: execution.exitCode }], artifacts: [], next_action: execution.exitCode === 0 ? 'continue workflow' : 'return to implementation', gate, started_at: startedAt, completed_at: new Date().toISOString(), output: execution.output };
  await mkdir(runDir, { recursive: true });
  const checksPath = path.join(runDir, 'checks.json');
  let checks = []; try { checks = JSON.parse(await readFile(checksPath, 'utf8')); } catch { /* first gate */ }
  checks.push(result); await writeFile(checksPath, `${JSON.stringify(checks, null, 2)}\n`);
  await appendEvent(runDir, { type: 'gate_completed', gate, exit_code: execution.exitCode });
  return result;
}
if (process.argv[1]?.endsWith('workflow-gates.mjs')) {
  const root = argument('--root') ?? process.cwd(); const runDir = argument('--run'); const gate = argument('--gate'); const command = argument('--command');
  if (!runDir || !gate || !command) throw new Error('Usage: node scripts/workflow-gates.mjs --run <run-dir> --gate <name> --command <command>');
  console.log(JSON.stringify(await runGate({ root, runDir, gate, command }), null, 2));
}
