// server.json: the settings every player on this server gets (read by src/modules/servers/serverManifest.ts).
import { createHash } from 'node:crypto';
import type { Config } from '../config';

const MANIFEST_VERSION = 1;

/** Where Caddy serves the modules folder (`caddy.ts`); relative to server.json's host. */
export const MODULES_PATH = '/server-modules/';

/** One streamed module as server.json lists it (`StreamedModuleEntry` in the client). */
export type ModuleEntry = { id: string; version: string; api: string; url: string; sha256: string; signature?: string };

/** A file of the modules folder and its description (`<name>.json`, undefined when there is none). */
export type ModuleFile = { file: string; bytes: Uint8Array; meta: unknown };

const ID = /^[a-z][a-z0-9_]{0,39}$/;
const SEMVER = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const SIGNATURE = /^[A-Za-z0-9_-]{85}[AQgw]$/;
const FILE = /^[A-Za-z0-9_.-]+\.js$/;

/** Why a module file cannot be listed, or its entry. */
function moduleEntry({ file, bytes, meta }: ModuleFile): ModuleEntry | string {
  if (!FILE.test(file)) return 'the file name may only use letters, digits, ".", "_" and "-", and end in .js';
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return `no description: add ${file.slice(0, -3)}.json`;
  const { id, version, api, signature, core } = meta as Record<string, unknown>;
  if (core !== undefined) return 'a streamed module cannot be core';
  if (typeof id !== 'string' || !ID.test(id)) return 'id: lower case letters, digits and _, at most 40';
  if (typeof version !== 'string' || !SEMVER.test(version)) return 'version: like 1.0.0';
  if (typeof api !== 'string' || !api || api.length > 64) return 'api: the module API range, like ^1.1';
  if (signature !== undefined && (typeof signature !== 'string' || !SIGNATURE.test(signature))) return 'signature: the output of tools/modules/sign.ts';
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { id, version, api, url: `${MODULES_PATH}${file}`, sha256, ...(signature === undefined ? {} : { signature }) };
}

/** The modules folder as server.json lists it, and the files left out with why. */
export function moduleEntries(files: readonly ModuleFile[]): { modules: ModuleEntry[]; errors: { file: string; why: string }[] } {
  const modules: ModuleEntry[] = [];
  const errors: { file: string; why: string }[] = [];
  for (const f of files) {
    const entry = moduleEntry(f);
    if (typeof entry === 'string') errors.push({ file: f.file, why: entry });
    else if (modules.some(m => m.id === entry.id)) errors.push({ file: f.file, why: `another file is already ${entry.id}` });
    else modules.push(entry);
  }
  return { modules, errors };
}

/** The client modules players on this world go without: the ones listed, and band when its relay is off. */
export function manifestModulesOff(c: Config): string[] {
  const listed = c.modulesOff.split(',').map(s => s.trim()).filter(Boolean);
  if (!c.band) listed.push('band');
  return [...new Set(listed)].sort();
}

export function serverManifest(c: Config, modules: readonly ModuleEntry[] = []): string {
  const manifest = {
    version: MANIFEST_VERSION,
    settings: {
      heldHitRequest: c.heldHitRequest,
      retryLoginWhenConnected: c.retryLoginWhenConnected,
      muHelperAfterReconnect: c.muHelperAfterReconnect,
      autoManaPotion: c.autoManaPotion,
      autoQuiver: c.autoQuiver,
    },
    modulesOff: manifestModulesOff(c),
    // Our OpenMU plugin issues them, and it is in every OpenMU image the installer builds (openmu/Dockerfile).
    loginTokens: true,
    // The client served beside this file skips the worlds list (src/modules/servers/directLogin.ts).
    directLogin: c.directLogin,
    // The modules folder (`<state>/modules`, state.ts): streamed to every player (docs/module_streaming.md).
    modules,
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
