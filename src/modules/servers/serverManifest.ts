import { LocalStorage } from '../../core/localStorage';
import { ServerConfig, onWorldEntered, type ServerProfile } from './serverConfig';
import { serverManifestUrl } from './serverServices';

/**
 * A world's `server.json`: what the server decides for every player on it. Fetched when the world
 * is entered, checked strictly, cached per server. Missing, unreachable or invalid means the
 * original client's behaviour. Format and rules: readme.md.
 */

/** The settings a server may set. Each default is the original client's behaviour. */
export type ServerSettings = {
  /** Hold the plain attack's HitRequest until the swing's hit key (ZzzInterface.cpp:3355 sends it on the click). */
  readonly heldHitRequest: boolean;
};

export type ServerManifest = { readonly version: 1; readonly settings: ServerSettings };

export const SERVER_MANIFEST_VERSION = 1;

export const ORIGINAL_SETTINGS: ServerSettings = { heldHitRequest: false };

/** The type each known setting must have; a key not listed here is ignored. */
const SETTING_TYPES: { readonly [K in keyof ServerSettings]: 'boolean' } = {
  heldHitRequest: 'boolean',
};

const CACHE_KEY = 'mu_server_manifests';
const MAX_BYTES = 16 * 1024;
const TIMEOUT_MS = 5000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * A `server.json` body, or null. It must be an object with `version` 1 and a `settings` object
 * whose known keys have their type; a wrong type anywhere rejects the whole document. Unknown keys
 * are skipped: a newer server may know settings this client does not.
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

  return { version: SERVER_MANIFEST_VERSION, settings: settings as ServerSettings };
}

/** The settings now in force, by manifest URL. */
const current = new Map<string, ServerSettings>();
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

/**
 * Fetches the world's manifest and puts it in force for that world. Until it answers, the cached
 * copy (if any) applies; a failed fetch drops the cache and leaves the original behaviour.
 */
export async function loadServerManifest(
  profile: ServerProfile = ServerConfig.active
): Promise<ServerSettings> {
  const url = serverManifestUrl(profile);
  if (!url) return ORIGINAL_SETTINGS;

  asked.add(url);
  if (!current.has(url)) current.set(url, cachedSettings(url));

  const manifest = await fetchManifest(url);
  const settings = manifest?.settings ?? ORIGINAL_SETTINGS;
  current.set(url, settings);
  writeCache(url, manifest);

  return settings;
}

function cachedSettings(url: string): ServerSettings {
  return parseServerManifest(readCache()[url])?.settings ?? ORIGINAL_SETTINGS;
}

/**
 * One setting of the world being played. Safe per click: a map read. A world nobody fetched yet
 * (entered without the server screen) starts its fetch here and answers from the cache meanwhile.
 */
export function serverSetting<K extends keyof ServerSettings>(key: K): ServerSettings[K] {
  const url = serverManifestUrl(ServerConfig.active);
  if (!url) return ORIGINAL_SETTINGS[key];

  let settings = current.get(url);
  if (!settings) {
    settings = cachedSettings(url);
    current.set(url, settings);
  }
  if (!asked.has(url)) void loadServerManifest(ServerConfig.active);

  return settings[key];
}

/** Tests only: forget what this launch fetched. */
export function resetServerManifests(): void {
  current.clear();
  asked.clear();
}

onWorldEntered(profile => void loadServerManifest(profile));
