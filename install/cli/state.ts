// Reads the config and renders every file the stack reads, all inside the state folder (owner-only).
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { configToEnv, envToConfig, parseEnvFile, toEnvFile, type Config } from './config';
import { files, isWindows, type Paths } from './paths';
import { caddyfile } from './render/caddy';
import { serviceEnv, stackEnv } from './render/env';
import { moduleEntries, serverManifest, type ModuleEntry } from './render/manifest';
import { ui } from './ui';
import { serverList } from './render/serverList';

export function loadConfig(p: Paths): Config | null {
  const file = files(p).config;
  return existsSync(file) ? envToConfig(parseEnvFile(readFileSync(file, 'utf8'))) : null;
}

function write(file: string, text: string, secret = false): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, text, { mode: secret ? 0o600 : 0o644 });
  if (secret && !isWindows) chmodSync(file, 0o600);
}

/** The modules folder's `.js` files, each with its `<name>.json` description; a file left out is named. */
function readModules(dir: string): ModuleEntry[] {
  mkdirSync(dir, { recursive: true });
  const found = moduleEntries(
    readdirSync(dir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .map(file => {
        const meta = join(dir, `${file.slice(0, -3)}.json`);
        let parsed: unknown;
        try {
          parsed = existsSync(meta) ? JSON.parse(readFileSync(meta, 'utf8')) : undefined;
        } catch {
          parsed = undefined;
        }
        return { file, bytes: new Uint8Array(readFileSync(join(dir, file))), meta: parsed };
      })
  );
  for (const { file, why } of found.errors) ui.warn(`Module ${file} is not streamed: ${why}`);
  return found.modules;
}

/** Saves the config and renders the service env files, the Caddyfile, the server list and server.json from it. */
export function saveState(c: Config, p: Paths): void {
  const f = files(p);
  write(f.config, toEnvFile(configToEnv(c)), true);
  write(f.stackEnv, toEnvFile(stackEnv(c, p)), true);
  for (const [service, env] of Object.entries(serviceEnv(c))) write(f.serviceEnv(service), toEnvFile(env), true);
  write(f.caddyfile, caddyfile(c));
  write(f.serverList, serverList(c));
  write(f.serverManifest, serverManifest(c, readModules(f.modules)));
}
