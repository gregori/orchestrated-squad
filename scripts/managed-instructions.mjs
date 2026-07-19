import { readFile, writeFile } from 'node:fs/promises';

const start = '<!-- orchestrated-squad:devin:start -->';
const end = '<!-- orchestrated-squad:devin:end -->';
export function mergeManagedInstructions(existing, block) {
  const normalized = block.trim();
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'g');
  if (expression.test(existing)) return `${existing.replace(expression, normalized).trimEnd()}\n`;
  return `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${normalized}\n`;
}
export async function applyManagedInstructions(target, source) {
  let existing = ''; try { existing = await readFile(target, 'utf8'); } catch { /* first install */ }
  const block = await readFile(source, 'utf8');
  await writeFile(target, mergeManagedInstructions(existing, block));
}
if (process.argv[1]?.endsWith('managed-instructions.mjs')) {
  const [target, source] = process.argv.slice(2);
  if (!target || !source) throw new Error('Usage: node scripts/managed-instructions.mjs <AGENTS.md> <managed-block.md>');
  await applyManagedInstructions(target, source);
}
