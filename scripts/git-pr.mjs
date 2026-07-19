import { spawn } from 'node:child_process';

const argument = (name) => { const at = process.argv.indexOf(name); return at === -1 ? undefined : process.argv[at + 1]; };
function execute(command, cwd) { return new Promise((resolve) => { const child = spawn(command, { cwd, shell: true, windowsHide: true }); let output = ''; child.stdout.on('data', (data) => { output += data; }); child.stderr.on('data', (data) => { output += data; }); child.on('close', (exitCode) => resolve({ exit_code: exitCode ?? 1, output: output.trim() })); }); }
export async function gitPr({ action = 'status', cwd = process.cwd(), confirm = false }) {
  if (action === 'status') return { schema_version: '1.0', action, external_action: false, ...(await execute('git status --short', cwd)) };
  if (action === 'create' && !confirm) return { schema_version: '1.0', action, external_action: false, status: 'blocked', reason: 'Pass --confirm after an explicit user checkpoint to create a pull request.' };
  if (action !== 'create') throw new Error(`Unknown action: ${action}`);
  return { schema_version: '1.0', action, external_action: true, status: 'blocked', reason: 'PR creation is intentionally deferred until the GitHub adapter is configured.' };
}
if (process.argv[1]?.endsWith('git-pr.mjs')) console.log(JSON.stringify(await gitPr({ action: argument('--action'), cwd: argument('--cwd'), confirm: process.argv.includes('--confirm') }), null, 2));
