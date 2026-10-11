// Puts a `mu` command on PATH that runs this installer from this checkout.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isWindows, type Paths } from './paths';
import { ui } from './ui';

export async function installLauncher(p: Paths): Promise<void> {
  const main = join(p.repo, 'install', 'cli', 'main.ts');
  const bun = process.execPath;
  if (isWindows) {
    // Bun's own bin folder is already on PATH.
    const file = join(dirname(bun), 'mu.cmd');
    writeFileSync(file, `@echo off\r\nset MU_STATE=${p.state}\r\n"${bun}" "${main}" %*\r\n`);
    ui.ok(`Command installed: mu (${file})`);
    return;
  }
  const file = '/usr/local/bin/mu';
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `#!/bin/sh\nexport MU_STATE='${p.state}'\nexec '${bun}' '${main}' "$@"\n`, { mode: 0o755 });
  ui.ok(`Command installed: mu (${file})`);
}
