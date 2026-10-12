import { LocalStorage } from '../../core/localStorage';
import { ServerConfig, onWorldEntered, type ServerProfile } from './serverConfig';
import { serverManifestUrl } from './serverServices';
import { setServerModulesOff } from '../module';
import { MODULE_ID as STREAMED_ID } from '../_api/contract';

/**
 * A world's `server.json`: what the server decides for every player on it. Fetched when the world
 * is entered, checked strictly, cached per server. Missing, unreachable or invalid means the
 * original client's behaviour. Format and rules: readme.md.
 */

/** The settings a server may set. Each default is the original client's behaviour. */
type ServerSettings = {
  /** Hold the plain attack's HitRequest until the swing's hit key (ZzzInterface.cpp:3355 sends it on the click). */
  readonly heldHitRequest: boolean;
  /** On "account already connected", send the same login again a few times (the original only shows it). */
  readonly retryLoginWhenConnected: boolean;
  /** Ask for the MU Helper again after an automatic reconnect when it was running (ours: the original has no resume). */
  readonly muHelperAfterReconnect: boolean;
  /** Drink a mana potion from the bag when mana runs low (ours: the original never drinks by itself). */
  readonly autoManaPotion: boolean;
  /** Put the next quiver in as soon as one runs out (the original waits for the next shot's CheckArrow, ZzzInterface.cpp:1206). */
  readonly autoQuiver: boolean;
};

/** One module the world streams to its players (docs/module_streaming.md, phase 5). */
export type StreamedModuleEntry = {
  readonly id: string;
  /** Semver, `1.2.3`: consent is asked again for a new version. */
  readonly version: string;
  /** The module API range it needs (`_api/contract.ts` `canServe`), checked before it loads. */
  readonly api: string;
  /** Where its file is: absolute (http or https) or relative to the manifest. */
  readonly url: string;
  /** SHA-256 of the file, lowercase hex: the cache key and the check. */
  readonly sha256: string;
  /** ed25519 over `id|version|sha256`, base64url: present on first-party modules. */
  readonly signature?: string;
};

type ServerManifest = {
  readonly version: 1;
  readonly settings: ServerSettings;
  /** The optional modules the server turned off, by id (`src/modules/modules.ts`). */
  readonly modulesOff: readonly string[];
  /** The server issues login tokens (our OpenMU plugin, `openmu/readme.md`); a saved login may keep one. */
  readonly loginTokens: boolean;
  /** The client served beside this file opens straight on this world's login (`directLogin.ts`); read at boot only. */
  readonly directLogin: boolean;
  /** The modules the world streams (phase 5); malformed entries are left out and named in `modulesDropped`. */
  readonly modules: readonly StreamedModuleEntry[];
  /** The entries left out of `modules`, by id (`#<index>` when the id itself is bad), for the notice. */
  readonly modulesDropped: readonly string[];
};

/** What a manifest puts in force for its world. */
type InForce = Pick<ServerManifest, 'settings' | 'loginTokens'>;

const SERVER_MANIFEST_VERSION = 1;

export const ORIGINAL_SETTINGS: ServerSettings = {
  heldHitRequest: false,
  retryLoginWhenConnected: false,
  muHelperAfterReconnect: false,
  autoManaPotion: false,
  autoQuiver: false,
};

const ORIGINAL: InForce = { settings: ORIGINAL_SETTINGS, loginTokens: false };

const MODULE_ID = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_MODULES_OFF = 64;
const MAX_STREAMED = 32;
const SEMVER = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const SHA256 = /^[0-9a-f]{64}$/;
/** 64 bytes in base64url without padding: 86 characters, the last one carrying 4 bits. */
const SIGNATURE = /^[A-Za-z0-9_-]{85}[AQgw]$/;

/** The type each known setting must have; a key not listed here is ignored. */
const SETTING_TYPES: { readonly [K in keyof ServerSettings]: 'boolean' } = {
  heldHitRequest: 'boolean',
  retryLoginWhenConnected: 'boolean',
  muHelperAfterReconnect: 'boolean',
  autoManaPotion: 'boolean',
  autoQuiver: 'boolean',
};

const CACHE_KEY = 'mu_server_manifests';
const MAX_BYTES = 16 * 1024;
const TIMEOUT_MS = 5000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** `modulesOff`, when present: at most 64 lowercase module ids. Anything else is invalid. */
function parseModulesOff(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_MODULES_OFF) return null;
  if (!raw.every(id => typeof id === 'string' && MODULE_ID.test(id))) return null;
  return [...new Set(raw as string[])];
}

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/** A module's file address: http or https, absolute or relative to the manifest. */
function isModuleUrl(url: unknown): url is string {
  if (!isText(url, 2048)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(url, 'https://manifest.invalid/').protocol);
  } catch {
    return false;
  }
}

/** One `modules` entry, or null when anything in it is malformed. An entry claiming `core` is refused. */
function parseStreamed(raw: unknown): StreamedModuleEntry | null {
  if (!isObject(raw) || Object.hasOwn(raw, 'core')) return null;
  const { id, version, api, url, sha256, signature } = raw;
  if (typeof id !== 'string' || !STREAMED_ID.test(id)) return null;
  if (typeof version !== 'string' || !SEMVER.test(version) || !isText(api, 64) || !isModuleUrl(url)) return null;
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) return null;
  if (signature !== undefined && (typeof signature !== 'string' || !SIGNATURE.test(signature))) return null;
  return { id, version, api, url, sha256, ...(signature === undefined ? {} : { signature }) };
}

/**
 * `modules`: a malformed entry, a repeated id and anything past 32 entries is dropped and named, never
 * the whole document; a `modules` that is not a list drops everything.
 */
function parseModules(raw: unknown): Pick<ServerManifest, 'modules' | 'modulesDropped'> {
  if (raw === undefined) return { modules: [], modulesDropped: [] };
  if (!Array.isArray(raw)) return { modules: [], modulesDropped: ['modules'] };
  const modules: StreamedModuleEntry[] = [];
  const modulesDropped: string[] = [];
  raw.forEach((item: unknown, i) => {
    const entry = parseStreamed(item);
    if (entry && modules.length < MAX_STREAMED && !modules.some(m => m.id === entry.id)) return void modules.push(entry);
    const id = isObject(item) ? item.id : undefined;
    modulesDropped.push(typeof id === 'string' && STREAMED_ID.test(id) ? id : `#${i}`);
  });
  return { modules, modulesDropped };
}

/**
 * A `server.json` body, or null. It must be an object with `version` 1 and a `settings` object
 * whose known keys have their type, and may carry `modulesOff`, `loginTokens`, `directLogin` and `modules`; a wrong
 * type rejects the whole document, except in `modules`, where only the bad entry goes. Unknown keys are skipped: a newer server may know settings this client does not.
 */
export function parseServerManifest(raw: unknown): ServerManifest | null {
  if (!isObject(raw) || raw.version !== SERVER_MANIFEST_VERSION || !isObject(raw.settings)) return null;

  const settings: Record<string, unknown> = { ...ORIGINAL_SETTINGS };

  for (const key of Object.keys(SETTING_TYPES) as (keyof ServerSettings)[]) {
    if (!Object.prototype.hasOwnProperty.call(raw.settings, key)) continue;
    const value = raw.settings[key];
    if (typeof value !== SETTING_TYPES[key]) return null;
    settings[key] = value;
  }

  const modulesOff = Object.prototype.hasOwnProperty.call(raw, 'modulesOff') ? parseModulesOff(raw.modulesOff) : [];
  if (!modulesOff) return null;

  const loginTokens = raw.loginTokens ?? false;
  if (typeof loginTokens !== 'boolean') return null;

  const directLogin = raw.directLogin ?? false;
  if (typeof directLogin !== 'boolean') return null;

  return {
    version: SERVER_MANIFEST_VERSION,
    settings: settings as ServerSettings,
    modulesOff,
    loginTokens,
    directLogin,
    ...parseModules(raw.modules),
  };
}

const inForce = (manifest: ServerManifest | null): InForce =>
  manifest ? { settings: manifest.settings, loginTokens: manifest.loginTokens } : ORIGINAL;

/** What is in force, by manifest URL. */
const current = new Map<string, InForce>();
/** URLs fetched (or being fetched) this launch. */
const asked = new Set<string>();

function readCache(): Record<string, unknown> {
  try {
    const raw: unknown = JSON.parse(LocalStorage.load(CACHE_KEY) ?? '{}');
    return isObject(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeCache(url: string, manifest: ServerManifest | null): void {
  const cache = readCache();
  if (manifest) cache[url] = manifest;
  else delete cache[url];
  LocalStorage.save(CACHE_KEY, JSON.stringify(cache));
}

/** The body at `url`, parsed, or null for any failure. */
async function fetchManifest(url: string): Promise<ServerManifest | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: abort.signal });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > MAX_BYTES) return null;
    return parseServerManifest(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ModulesListener = (world: string, manifestUrl: string, modules: readonly StreamedModuleEntry[], dropped: readonly string[]) => void;
const modulesListeners = new Set<ModulesListener>();

/**
 * Runs `fn` with each world's module list as its fetch answers (`_api/streamPorts.ts`, the streamer);
 * a failed fetch lists none. The cached copy never does: code loads only from a fresh list. Returns the end.
 */
export function onModulesListed(fn: ModulesListener): () => void {
  modulesListeners.add(fn);
  return () => void modulesListeners.delete(fn);
}

/**
 * Fetches the world's manifest and puts it in force for that world. Until it answers, the cached
 * copy (if any) applies; a failed fetch drops the cache and leaves the original behaviour.
 */
export async function loadServerManifest(
  profile: ServerProfile = ServerConfig.active
): Promise<ServerSettings> {
  const url = serverManifestUrl(profile);
  if (!url) {
    setServerModulesOff([]);
    for (const fn of modulesListeners) fn(profile.id, '', [], []);
    return ORIGINAL_SETTINGS;
  }

  asked.add(url);
  const cached = cachedManifest(url);
  if (!current.has(url)) current.set(url, inForce(cached));
  setServerModulesOff(cached?.modulesOff ?? []);

  const manifest = await fetchManifest(url);
  current.set(url, inForce(manifest));
  setServerModulesOff(manifest?.modulesOff ?? []);
  writeCache(url, manifest);
  for (const fn of modulesListeners) fn(profile.id, url, manifest?.modules ?? [], manifest?.modulesDropped ?? []);

  return inForce(manifest).settings;
}

function cachedManifest(url: string): ServerManifest | null {
  return parseServerManifest(readCache()[url]);
}

/**
 * What the world being played has in force. Safe per click: a map read. A world nobody fetched yet
 * (entered without the server screen) starts its fetch here and answers from the cache meanwhile.
 */
function worldInForce(): InForce {
  const url = serverManifestUrl(ServerConfig.active);
  if (!url) return ORIGINAL;

  let found = current.get(url);
  if (!found) {
    found = inForce(cachedManifest(url));
    current.set(url, found);
  }
  if (!asked.has(url)) void loadServerManifest(ServerConfig.active);

  return found;
}

/** One setting of the world being played. */
export function serverSetting<K extends keyof ServerSettings>(key: K): ServerSettings[K] {
  return worldInForce().settings[key];
}

/** Whether the world being played issues login tokens: off unless its `server.json` says `loginTokens: true`. */
export function serverOffersLoginTokens(): boolean {
  return worldInForce().loginTokens;
}

/** Tests only: forget what this launch fetched. */
export function resetServerManifests(): void {
  current.clear();
  asked.clear();
}

onWorldEntered(profile => void loadServerManifest(profile));
