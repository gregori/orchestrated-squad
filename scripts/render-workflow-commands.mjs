import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, '.agents', 'skills');
const targets = [
  { directory: path.join(root, '.claude', 'skills'), format: 'skill' },
  { directory: path.join(root, '.github', 'skills'), format: 'skill' },
  { directory: path.join(root, '.opencode', 'commands'), format: 'command' },
];

function bodyOf(skill) { return skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''); }
function descriptionOf(skill, name) {
  return skill.match(/^---\r?\n[\s\S]*?^description:\s*(.+)$/m)?.[1]?.trim() ?? `Run the ${name} workflow.`;
}

export async function renderWorkflowCommands() {
  const names = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('squad-'))
    .map((entry) => entry.name).sort();
  for (const target of targets) {
    await mkdir(target.directory, { recursive: true });
    for (const name of names) {
      const skill = await readFile(path.join(source, name, 'SKILL.md'), 'utf8');
      if (target.format === 'skill') {
        const directory = path.join(target.directory, name);
        await rm(directory, { recursive: true, force: true });
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, 'SKILL.md'), skill);
      } else {
        await writeFile(path.join(target.directory, `${name}.md`), `---\ndescription: ${descriptionOf(skill, name)}\n---\n\n${bodyOf(skill)}`);
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await renderWorkflowCommands();
