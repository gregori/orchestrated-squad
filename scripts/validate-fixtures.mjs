import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validate(schema, value, location = '$') {
  const errors = [];
  const report = (message) => errors.push(`${location}: ${message}`);
  if (schema.const !== undefined && value !== schema.const) report(`must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) report(`must be one of ${schema.enum.join(', ')}`);
  if (schema.type) {
    const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const expected = schema.type === 'integer' ? (Number.isInteger(value) ? 'integer' : actual) : actual;
    if (expected !== schema.type) { report(`must be ${schema.type}`); return errors; }
  }
  if (schema.type === 'string') {
    if (schema.minLength && value.length < schema.minLength) report(`must have at least ${schema.minLength} characters`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) report(`must match ${schema.pattern}`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) report('must be a date-time');
  }
  if (schema.type === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) report(`must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) report(`must be <= ${schema.maximum}`);
  }
  if (schema.type === 'array') {
    if (schema.minItems && value.length < schema.minItems) report(`must have at least ${schema.minItems} items`);
    if (schema.items) value.forEach((item, index) => errors.push(...validate(schema.items, item, `${location}[${index}]`)));
  }
  if (schema.type === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) report(`missing required property '${key}'`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validate(schema.properties[key], item, `${location}.${key}`));
      else if (schema.additionalProperties === false) report(`does not allow property '${key}'`);
      else if (typeof schema.additionalProperties === 'object') errors.push(...validate(schema.additionalProperties, item, `${location}.${key}`));
    }
  }
  return errors;
}

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat();
}

async function targetHash(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const isDirectory = (await (await import('node:fs/promises')).stat(absolutePath)).isDirectory();
  if (!isDirectory) return createHash('sha256').update(await readFile(absolutePath)).digest('hex');
  const entries = await files(absolutePath);
  const lines = await Promise.all(entries.sort().map(async (file) => {
    const digest = createHash('sha256').update(await readFile(file)).digest('hex');
    return `${digest}  ${path.relative(root, file).split(path.sep).join('/')}`;
  }));
  return createHash('sha256').update(`${lines.join('\n')}\n`).digest('hex');
}

export async function validateContractFixtures() {
  const fixtureDir = path.join(root, 'tests', 'fixtures', 'contracts');
  const names = ['agent', 'workflow', 'state', 'handoff', 'result'];
  const failures = [];
  for (const name of names) {
    const schema = JSON.parse(await readFile(path.join(root, 'schemas', `${name}.schema.json`)));
    const valid = JSON.parse(await readFile(path.join(fixtureDir, `${name}.valid.json`)));
    const invalid = JSON.parse(await readFile(path.join(fixtureDir, `${name}.invalid.json`)));
    const validErrors = validate(schema, valid);
    const invalidErrors = validate(schema, invalid);
    if (validErrors.length) failures.push(`${name}.valid: ${validErrors.join('; ')}`);
    if (!invalidErrors.length) failures.push(`${name}.invalid: expected a validation error`);
  }
  const snapshots = JSON.parse(await readFile(path.join(root, 'tests', 'fixtures', 'current', 'targets.json')));
  for (const target of snapshots.targets) {
    if (target.expect_current === false) continue;
    const actual = await targetHash(target.path);
    if (actual !== target.sha256) failures.push(`${target.path}: snapshot hash differs (expected ${target.sha256}, got ${actual})`);
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = await validateContractFixtures();
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log('Contract schemas and frozen target snapshots are valid.');
}
