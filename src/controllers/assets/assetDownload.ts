import { makeAutoObservable, runInAction } from 'mobx';
import { gameVersion } from '../../version';
import {
  COMPRESSED_SUFFIX,
  isCompressedAsset,
  settleSidecars,
  sidecarsAvailable,
} from './compressedAssets';
import { liteUrl, liteWanted, setLiteIndexLoader, setLiteVariants } from './liteAssets';
import { resolveDataUrl } from './mu/dataFolder';
import { assetsIndexUrl } from './resolveUrlToDataFolder';

/**
 * Pre-game download of asset groups (the version's `assets-index*.json`, `tools/assetsIndex.ts`)
 * into the service worker cache (`public/sw.js`). See assets/readme.md.
 */

export type AssetGroup = {
  id: string;
  kind: 'core' | 'monsters' | 'audio' | 'icons' | 'map';
  name: string;
  world?: number;
  files: number;
  /** Bytes on disk. */
  bytes: number;
  /** Bytes over the wire, sidecars counted. */
  transfer: number;
  /** `[directory, [[fileName, bytes], ...]]` - flattened by `urlsOf`. */
  dirs: [string, [string, number][]][];
  /** The lighter copies the build wrote (`tools/liteAssets.ts`), shaped like `dirs`. */
  lite?: [string, [string, number][]][];
  /** Bytes over the wire with every copy taken. */
  liteTransfer?: number;
};

type AssetsIndex = {
  built: string;
  sidecars: boolean;
  groups: AssetGroup[];
};

const CHOSEN_KEY = 'mu_download_groups';
/** How many files are in flight at once. */
const CONCURRENCY = 6;

/** Every file in a group, as the plain (pre-sidecar) URL. */
export function urlsOf(group: AssetGroup): { url: string; bytes: number }[] {
  const out: { url: string; bytes: number }[] = [];
  for (const [dir, files] of group.dirs) {
    for (const [name, bytes] of files) out.push({ url: dir + name, bytes });
  }
  return out;
}

/** A group's files as this player reads them: a lighter copy in place of its original where `liteUrl` picks one. */
export function filesToFetch(group: AssetGroup): { url: string; bytes: number }[] {
  const copies = new Map(urlsOf({ ...group, dirs: group.lite ?? [] }).map(f => [f.url, f.bytes]));
  return urlsOf(group).map(file => {
    const lite = liteUrl(file.url);
    const bytes = lite === null ? undefined : copies.get(lite);
    return lite !== null && bytes !== undefined ? { url: lite, bytes } : file;
  });
}

/**
 * The URL the game will actually request for this asset, which is the only
 * one worth downloading.
 */
function requestUrl(url: string, sidecars: boolean): string {
  return sidecars && isCompressedAsset(url) ? url + COMPRESSED_SUFFIX : url;
}

class AssetDownloadStore {
  index: AssetsIndex | null = null;
  /** Group ids the player has ticked. */
  chosen: Set<string> = new Set(load());
  running = false;
  /** 0..1 over the whole selection. */
  progress = 0;
  /** Bytes fetched this run. */
  received = 0;
  /** Denominator for this run. */
  expected = 0;
  /** Group ids already fully in the cache, as far as we last checked. */
  cached: Set<string> = new Set();
  error: string | null = null;
  done = false;

  constructor() {
    makeAutoObservable(this);
  }

  get groups(): AssetGroup[] {
    return this.index?.groups ?? [];
  }

  /** What the ticked groups cost over the wire. */
  get selectedTransfer(): number {
    return this.groups
      .filter(g => this.isChosen(g))
      .reduce((n, g) => n + (liteWanted() ? (g.liteTransfer ?? g.transfer) : g.transfer), 0);
  }

  isChosen(group: AssetGroup): boolean {
    // Core is not optional: without it there is no game to enter.
    return group.kind === 'core' || this.chosen.has(group.id);
  }

  toggle(group: AssetGroup): void {
    if (group.kind === 'core') return;
    runInAction(() => {
      if (this.chosen.has(group.id)) this.chosen.delete(group.id);
      else this.chosen.add(group.id);
    });
    save(this.chosen);
  }
}

export const assetDownload = new AssetDownloadStore();

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHOSEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(chosen: Set<string>): void {
  try {
    localStorage.setItem(CHOSEN_KEY, JSON.stringify([...chosen]));
  } catch {
    /* private window; the choice just does not persist */
  }
}

let indexPending: Promise<AssetsIndex | null> | null = null;

/** The catalogue, or null when the build did not write one. */
export function loadAssetsIndex(): Promise<AssetsIndex | null> {
  indexPending ??= (async () => {
    try {
      const res = await fetch(assetsIndexUrl(gameVersion.data));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = (await res.json()) as AssetsIndex;
      setLiteVariants(parsed.groups.flatMap(g => urlsOf({ ...g, dirs: g.lite ?? [] }).map(f => f.url)));
      runInAction(() => {
        assetDownload.index = parsed;
      });
      return parsed;
    } catch {
      // A dev server has no index (it is written over dist/ at the end of the
      // build). No index means no download screen, which is the right
      // outcome rather than an error in the player's face.
      return null;
    }
  })();
  return indexPending;
}

// The reads learn which lighter copies exist from the index, fetched the first time one is wanted.
setLiteIndexLoader(() => void loadAssetsIndex());

// ------------------------------------------------------------ the worker

let workerReady: Promise<ServiceWorker | null> | null = null;

/** Register the cache worker. Resolves null when the browser will not have one. */
export function ensureCacheWorker(): Promise<ServiceWorker | null> {
  workerReady ??= (async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      if (new URLSearchParams(location.search).has('nosw')) return null;
    } catch {
      /* keep going */
    }
    try {
      // The build in the URL: a deploy installs a new worker, which drops the old build's files.
      const build = typeof BUILD_ID === 'string' ? BUILD_ID : 'dev';
      const reg = await navigator.serviceWorker.register(`./sw.js?build=${encodeURIComponent(build)}`);
      await navigator.serviceWorker.ready;
      return reg.active ?? navigator.serviceWorker.controller;
    } catch (e) {
      console.warn('[assetDownload] no cache worker:', (e as Error).message);
      return null;
    }
  })();
  return workerReady;
}

function ask<T>(worker: ServiceWorker, message: unknown): Promise<T | null> {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = e => resolve(e.data as T);
    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      resolve(null);
    }
    setTimeout(() => resolve(null), 15000);
  });
}

/** Wipe everything the player downloaded. */
export async function clearDownloaded(): Promise<void> {
  const worker = await ensureCacheWorker();
  if (worker) await ask(worker, { type: 'mu-cache-clear' });
  else await caches.delete('mu-assets-v1').catch(() => {});
  runInAction(() => {
    assetDownload.cached = new Set();
    assetDownload.done = false;
    assetDownload.progress = 0;
  });
}

/** Roughly how much of the origin's quota is in use, for the screen's footer. */
export async function storageUsed(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ downloading

let cancelled = false;

export function cancelDownload(): void {
  cancelled = true;
}

/**
 * Fetch every chosen group into the cache.
 *
 * Files already stored are skipped, so this doubles as "resume": an
 * interrupted run picks up where it stopped.
 */
export async function startDownload(extraUrls: string[] = []): Promise<void> {
  if (assetDownload.running) return;

  const index = assetDownload.index ?? (await loadAssetsIndex());
  if (!index) return;

  cancelled = false;
  runInAction(() => {
    assetDownload.running = true;
    assetDownload.error = null;
    assetDownload.done = false;
    assetDownload.received = 0;
    assetDownload.progress = 0;
  });

  try {
    // Before anything else: decide which of the two URL shapes this
    // deployment serves, or the whole download goes to the wrong one.
    await settleSidecars(resolveDataUrl('gate.bmd'));
    const sidecars = sidecarsAvailable();

    await ensureCacheWorker();
    const cache = await caches.open('mu-assets-v1');

    const wanted: { url: string; bytes: number }[] = [];
    for (const group of index.groups) {
      if (!assetDownload.isChosen(group)) continue;
      for (const file of filesToFetch(group)) wanted.push(file);
    }
    for (const url of extraUrls) wanted.push({ url, bytes: 0 });

    runInAction(() => {
      assetDownload.expected = wanted.reduce((n, f) => n + f.bytes, 0) || 1;
    });

    let next = 0;
    const worker = async () => {
      for (;;) {
        if (cancelled) return;
        const i = next++;
        if (i >= wanted.length) return;
        const { url, bytes } = wanted[i];

        // The cache is keyed on what the game will ask for.
        const key = requestUrl(url, sidecars);

        try {
          if (!(await cache.match(key))) {
            let res = await fetch(key, { cache: 'no-store' });

            // A sidecar the index expected but the deploy does not carry.
            // The game would fall back to the plain file here too, so cache
            // that instead of leaving the asset out altogether.
            if (!res.ok && key !== url) {
              res = await fetch(url, { cache: 'no-store' });
              if (res.ok) await cache.put(url, res.clone());
            } else if (res.ok) {
              await cache.put(key, res.clone());
            }
          }
        } catch {
          // One unreachable file is not a failed download: the game still
          // goes to the network for whatever is not stored.
        }

        runInAction(() => {
          assetDownload.received += bytes;
          assetDownload.progress = Math.min(1, assetDownload.received / assetDownload.expected);
        });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    runInAction(() => {
      assetDownload.done = !cancelled;
      if (!cancelled) {
        assetDownload.progress = 1;
        for (const g of index.groups) {
          if (assetDownload.isChosen(g)) assetDownload.cached.add(g.id);
        }
      }
    });
  } catch (e) {
    runInAction(() => {
      assetDownload.error = (e as Error).message;
    });
  } finally {
    runInAction(() => {
      assetDownload.running = false;
    });
  }
}
