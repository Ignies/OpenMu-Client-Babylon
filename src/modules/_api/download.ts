// Streamed modules, before they load (readme.md, "Streaming"): the API range, the download, the hash,
// Cache Storage by hash. A module that fails any of them is skipped with a notice, never run.
import type { TextKey } from '@/i18n';
import type { StreamedModuleEntry } from '../servers/serverManifest';
import { MODULE_API_VERSION, canServe } from './contract';

/** The largest module file the client downloads. */
export const MAX_MODULE_BYTES = 4 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** Where downloaded modules are kept, by SHA-256. */
export interface ModuleStore {
  get(sha256: string): Promise<Uint8Array | null>;
  put(sha256: string, bytes: Uint8Array): Promise<void>;
}

/** A line for the player: a text key of `i18n/` and its holes. */
export type StreamNotice = { key: TextKey; params: Record<string, string> };

/** A module that passed: its entry and its checked bytes. */
export type ReadyModule = { entry: StreamedModuleEntry; bytes: Uint8Array };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  let hex = '';
  for (const b of digest) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Cache Storage, one entry per hash under a URL nothing serves. A failing cache keeps nothing. */
export function cacheStore(open: () => Promise<Cache>, origin: string): ModuleStore {
  const key = (sha256: string) => `${origin}/__mu_modules/${sha256}`;
  return {
    async get(sha256) {
      try {
        const res = await (await open()).match(key(sha256));
        return res ? new Uint8Array(await res.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },
    async put(sha256, bytes) {
      try {
        await (await open()).put(key(sha256), new Response(bytes));
      } catch {
        // full or refused: the module downloads again next time
      }
    },
  };
}

/** For a page without Cache Storage (plain http): kept until the page reloads. */
export function memoryStore(): ModuleStore {
  const kept = new Map<string, Uint8Array>();
  return {
    get: async sha256 => kept.get(sha256) ?? null,
    put: async (sha256, bytes) => void kept.set(sha256, bytes),
  };
}

/** The file's bytes, or null for any failure: an error status, a timeout, over the size limit. */
async function download(url: string, fetchFn: Fetch): Promise<Uint8Array | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetchFn(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: abort.signal });
    if (!res.ok || Number(res.headers.get('content-length') ?? 0) > MAX_MODULE_BYTES) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length > MAX_MODULE_BYTES ? null : bytes;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One module: its range, then the cache or a download, then its hash. */
async function prepare(entry: StreamedModuleEntry, manifestUrl: string, store: ModuleStore, fetchFn: Fetch): Promise<Uint8Array | StreamNotice> {
  const id = entry.id;
  if (!canServe(entry.api)) return { key: 'moduleStream.api', params: { id, range: entry.api, have: MODULE_API_VERSION } };
  const cached = await store.get(entry.sha256);
  if (cached && (await sha256Hex(cached)) === entry.sha256) return cached;
  const bytes = await download(new URL(entry.url, manifestUrl).href, fetchFn);
  if (!bytes) return { key: 'moduleStream.download', params: { id } };
  if ((await sha256Hex(bytes)) !== entry.sha256) return { key: 'moduleStream.hash', params: { id } };
  await store.put(entry.sha256, bytes);
  return bytes;
}

/**
 * The world's list made ready to load, in list order: each module whose range this client serves and
 * whose bytes match its hash. Everything else, and each entry the manifest dropped, is a notice.
 */
export async function prepareModules(
  entries: readonly StreamedModuleEntry[],
  dropped: readonly string[],
  manifestUrl: string,
  { store, fetch: fetchFn }: { store: ModuleStore; fetch: Fetch }
): Promise<{ ready: ReadyModule[]; notices: StreamNotice[] }> {
  const notices: StreamNotice[] = dropped.map(id => ({ key: 'moduleStream.dropped', params: { id } }));
  const ready: ReadyModule[] = [];
  for (const entry of entries) {
    const got = await prepare(entry, manifestUrl, store, fetchFn);
    if (got instanceof Uint8Array) ready.push({ entry, bytes: got });
    else notices.push(got);
  }
  return { ready, notices };
}
