// Reads the config and renders every file the stack reads, all inside the state folder (owner-only).
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { configToEnv, envToConfig, parseEnvFile, toEnvFile, type Config } from './config';
import { files, isWindows, type Paths } from './paths';
import { caddyfile } from './render/caddy';
import { serviceEnv, stackEnv } from './render/env';
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

/** Saves the config and renders the service env files, the Caddyfile and the server list from it. */
export function saveState(c: Config, p: Paths): void {
  const f = files(p);
  write(f.config, toEnvFile(configToEnv(c)), true);
  write(f.stackEnv, toEnvFile(stackEnv(c, p)), true);
  for (const [service, env] of Object.entries(serviceEnv(c))) write(f.serviceEnv(service), toEnvFile(env), true);
  write(f.caddyfile, caddyfile(c));
  write(f.serverList, serverList(c));
}
