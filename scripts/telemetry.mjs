import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
  return { ...report, authorization: 'Manual review required; no upload is performed by this command.' };
}
