#!/usr/bin/env node
// Entrada do runtime local instalado em .squad/bin/squad.mjs: só `state`, `gate` e `hook`.
// Sem dependências e sem rede: roda com `node .squad/bin/squad.mjs …`.
import process from 'node:process';
import { RUN_COMMANDS, runCommand, runUsage } from './run-cli.mjs';

export async function main(argv) {
  if (!RUN_COMMANDS.includes(argv[0])) {
    console.log(runUsage());
    return argv[0] && !['-h', '--help'].includes(argv[0]) ? 1 : 0;
  }
  const { result, exitCode, stderr } = await runCommand(argv[0], argv.slice(1));
  if (argv[0] === 'hook') { if (result) process.stdout.write(`${JSON.stringify(result)}\n`); }
  else console.log(JSON.stringify(result, null, 2));
  if (stderr) process.stderr.write(`${stderr}\n`);
  return exitCode;
}

if (process.argv[1]?.endsWith('runtime.mjs') || process.argv[1]?.endsWith('squad.mjs')) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((error) => { console.error(`squad: ${error.message}`); process.exitCode = 1; });
}
