import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

async function present(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
async function json(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return {}; } }
export async function discoverProject(root) {
  const packageFile = path.join(root, 'package.json'); const python = await present(path.join(root, 'pyproject.toml'));
  const node = await present(packageFile); const pkg = node ? await json(packageFile) : {};
  const languages = [node && 'node', python && 'python'].filter(Boolean);
  const commands = Object.entries(pkg.scripts ?? {}).filter(([name]) => ['lint', 'test', 'build', 'typecheck', 'format'].includes(name)).map(([name, command]) => ({ name, command, confidence: 'confirmed' }));
  return { languages, confidence: languages.length ? 'confirmed' : 'unknown', commands, questions: languages.length ? [] : ['Which language, framework and validation commands does this project use?'] };
}
