import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
export const defaultMetricsRepository = 'gregori/orchestrated-squad-metrics';
const telemetryDir = (root) => path.join(root, '.squad', 'telemetry');
const eventsFile = (root) => path.join(telemetryDir(root), 'events.jsonl');
const settingsFile = (root) => path.join(telemetryDir(root), 'settings.json');
const forbidden = /(?:prompt|diff|secret|token|password|path|branch|repository|repo|content|recorded_at|timestamp)/i;

async function settings(root) { try { return JSON.parse(await readFile(settingsFile(root), 'utf8')); } catch { return { enabled: true, retention_days: 30 }; } }
export function sanitize(event) {
  const output = {};
  for (const [key, value] of Object.entries(event)) if (!forbidden.test(key) && (value === null || ['string', 'number', 'boolean'].includes(typeof value))) output[key] = value;
  return output;
}
export async function recordTelemetry(root, event) {
  if (!(await settings(root)).enabled) return false;
  await mkdir(telemetryDir(root), { recursive: true });
  await appendFile(eventsFile(root), `${JSON.stringify({ schema_version: 1, recorded_at: new Date().toISOString(), ...sanitize(event) })}\n`);
  return true;
}
export async function telemetryEvents(root) {
  try { return (await readFile(eventsFile(root), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; }
}
export async function exportTelemetry(root, output) {
  const events = await telemetryEvents(root); const report = { schema_version: 1, runs: events.length, events: events.map(sanitize) };
  if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
export async function disableTelemetry(root) {
  await mkdir(telemetryDir(root), { recursive: true });
  await writeFile(settingsFile(root), `${JSON.stringify({ enabled: false, retention_days: 30 }, null, 2)}\n`);
}
export async function purgeTelemetry(root) { await rm(eventsFile(root), { force: true }); }
export async function contributionPreview(root) {
  const report = await exportTelemetry(root);
  if (report.runs < 5) throw new Error('Telemetry contribution requires at least five runs.');
  return { ...report, authorization: 'A pull request is required for maintainer review.' };
}

async function gh(args, run) {
  try {
    const result = await run('gh', args);
    return typeof result === 'string' ? result.trim() : result.stdout.trim();
  } catch (error) {
    throw new Error(`GitHub CLI failed: ${error.stderr?.trim() || error.message}`);
  }
}

export async function contributeTelemetry(root, { repository = defaultMetricsRepository, run = execFileAsync } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Telemetry repository must use owner/name format.');
  const report = await contributionPreview(root);
  const nonce = randomUUID();
  const branch = `telemetry/contribution-${nonce}`;
  const filename = `contributions/contribution-${nonce}.json`;
  const base = await gh(['api', `repos/${repository}`, '--jq', '.default_branch'], run);
  const sha = await gh(['api', `repos/${repository}/git/ref/heads/${base}`, '--jq', '.object.sha'], run);
  await gh(['api', '--method', 'POST', `repos/${repository}/git/refs`, '-f', `ref=refs/heads/${branch}`, '-f', `sha=${sha}`], run);
  const content = Buffer.from(`${JSON.stringify(report, null, 2)}\n`).toString('base64');
  await gh(['api', '--method', 'PUT', `repos/${repository}/contents/${filename}`, '-f', 'message=telemetry: add aggregate contribution', '-f', `content=${content}`, '-f', `branch=${branch}`], run);
  const pullRequest = await gh(['pr', 'create', '--repo', repository, '--head', branch, '--base', base, '--title', 'telemetry: add aggregate contribution', '--body', 'Automated sanitized aggregate telemetry contribution. Review before merge.'], run);
  return { ...report, repository, branch, file: filename, pull_request: pullRequest };
}
