import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { scopeCheck } from './scope-check.mjs';
import { appendEvent, loadWorkflow, readState } from './workflow-state.mjs';

/** Único gate runner. Gates determinísticos: nenhum LLM decide o resultado. */
const GATE_REGISTRY = {
  lint: { description: 'Static analysis and linting', blocking: true },
  test: { description: 'Test execution', blocking: true },
  build: { description: 'Build verification', blocking: true },
  typecheck: { description: 'Type checking', blocking: true },
  scope: { description: 'Changed files are within the reserved write_scope', blocking: true },
  'git-status': { description: 'Git working tree status', blocking: false },
  format: { description: 'Code formatting check', blocking: false },
};

/**
 * Lê a seção `gates:` do `.squad/config.yaml` gerado pelo instalador:
 *   gates:
 *     lint:
 *       command: "npm run lint"
 *       blocking: true
 */
export async function readGateConfig(root) {
  let text;
  try { text = await readFile(path.join(root, '.squad', 'config.yaml'), 'utf8'); } catch { return {}; }
  const gates = {}; let inGates = false; let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\S/.test(line)) { inGates = /^gates:\s*$/.test(line); current = null; continue; }
    if (!inGates || /^\s*(#|$)/.test(line)) continue;
    const name = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (name) { current = name[1]; gates[current] = {}; continue; }
    const field = line.match(/^ {4}([a-z_]+):\s*(.*?)\s*$/);
    if (current && field) {
      let value = field[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (value === 'true' || value === 'false') value = value === 'true';
      gates[current][field[1]] = value;
    }
  }
  return gates;
}

async function executeCommand(command, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, output: output.trim() }));
  });
}

async function persist(runDir, result) {
  await mkdir(runDir, { recursive: true });
  const checksPath = path.join(runDir, 'checks.json');
  let checks = [];
  try { checks = JSON.parse(await readFile(checksPath, 'utf8')); } catch { /* first gate */ }
  checks.push(result);
  await writeFile(checksPath, `${JSON.stringify(checks, null, 2)}\n`);
  await appendEvent(runDir, { type: 'gate_completed', gate: result.gate, exit_code: result.evidence?.[0]?.exit_code ?? null, outcome: result.outcome });
}

/**
 * Executa um gate. Sem comando: `blocked` se o gate é obrigatório, `skipped` se não.
 * Resultados: passed | failed | blocked | skipped.
 */
export async function runGate({ root, runDir, gate, command, required = false }) {
  const config = GATE_REGISTRY[gate] ?? { description: gate, blocking: false };
  const blocking = required || config.blocking;
  const startedAt = new Date().toISOString();
  let result;
  if (gate === 'scope') {
    const scope = await scopeCheck({ root, runDir });
    result = { outcome: scope.ok ? 'passed' : 'failed', summary: scope.summary, evidence: [{ command: 'git diff --name-only <base_ref>', exit_code: scope.ok ? 0 : 1 }], output: scope.outside.length ? `outside write_scope:\n${scope.outside.join('\n')}` : '' };
  } else if (!command) {
    result = required
      ? { outcome: 'blocked', summary: `Required gate "${gate}" has no command configured in .squad/config.yaml`, evidence: [] }
      : { outcome: 'skipped', summary: `No command configured for gate "${gate}"`, evidence: [] };
  } else {
    const execution = await executeCommand(command, root);
    const passed = execution.exitCode === 0;
    result = { outcome: passed ? 'passed' : 'failed', summary: passed ? `${gate} passed` : `${gate} failed`, evidence: [{ command, exit_code: execution.exitCode }], output: execution.output.slice(0, 5000) };
  }
  const full = {
    schema_version: '1.0', gate, blocking, required, ...result,
    started_at: startedAt, completed_at: new Date().toISOString(),
    next_action: result.outcome === 'passed' || result.outcome === 'skipped' || !blocking ? 'continue' : result.outcome === 'blocked' ? 'configure the gate command' : 'return to implementation',
  };
  await persist(runDir, full);
  return full;
}

/** Gates obrigatórios: os do workflow (`required_gates`) + os `blocking: true` da configuração. */
export async function requiredGates(root, runDir) {
  const state = await readState(runDir).catch(() => null);
  const workflow = state ? await loadWorkflow(state.workflow) : null;
  const config = await readGateConfig(root);
  return [...new Set([...(workflow?.required_gates ?? []), ...Object.entries(config).filter(([, gate]) => gate.blocking === true).map(([name]) => name)])];
}

export async function runGates({ root, runDir, gates, commands = {}, required = [] }) {
  const results = [];
  for (const gate of gates) {
    const result = await runGate({ root, runDir, gate, command: commands[gate], required: required.includes(gate) });
    results.push(result);
    if (result.blocking && ['failed', 'blocked'].includes(result.outcome)) {
      return { schema_version: '1.0', outcome: 'blocked', blocked_by: gate, results, next_action: result.next_action };
    }
  }
  return { schema_version: '1.0', outcome: 'passed', results, next_action: 'continue workflow' };
}

/**
 * Roda os gates de uma run com os comandos do `.squad/config.yaml` (nunca do agente).
 * `gates` limita a lista; por padrão, todos os configurados + os obrigatórios.
 */
export async function runConfiguredGates({ root, runDir, gates }) {
  const config = await readGateConfig(root);
  const required = await requiredGates(root, runDir);
  const commands = Object.fromEntries(Object.entries(config).map(([name, gate]) => [name, gate.command]));
  const ordered = gates ?? [...new Set([...Object.keys(config).filter((name) => name !== 'scope'), ...required.filter((name) => name !== 'scope'), 'scope'])];
  return runGates({ root, runDir, gates: ordered, commands, required });
}

// CLI de compatibilidade (prefira `squad gate <run-id>`)
if (process.argv[1]?.endsWith('gate-runner.mjs')) {
  const getArg = (name) => { const idx = process.argv.indexOf(name); return idx === -1 ? undefined : process.argv[idx + 1]; };
  const root = getArg('--root') ?? process.cwd();
  const runDir = getArg('--run');
  if (!runDir) {
    console.error('Usage: node scripts/gate-runner.mjs --root <root> --run <run-dir> [--gates lint,test,scope]');
    process.exit(1);
  }
  const gates = getArg('--gates')?.split(',').map((g) => g.trim()).filter(Boolean);
  const result = await runConfiguredGates({ root, runDir, gates });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.outcome === 'passed' ? 0 : 1);
}
