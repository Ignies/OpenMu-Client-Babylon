import { makeAutoObservable, runInAction } from 'mobx';
import { t } from '@/i18n';
import { parseServerManifest } from './serverManifest';
import { parseServerList } from './serverList';
import { ServerConfig, type PublishedGameServer, type ServerProfile } from './serverConfig';
import type { Servers } from './state';

/**
 * The installer's direct login (readme.md): a client served beside a `server.json` saying
 * `directLogin: true` opens straight on the login of the first world in the `serverlist.md`
 * beside it. Anything else (no file, off, malformed) leaves the worlds list as it was.
 */

const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;

/** A file served next to the page, or null for any failure. */
async function besideThePage(file: string): Promise<string | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`./${file}`, { cache: 'no-cache', credentials: 'omit', signal: abort.signal });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_BYTES ? null : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string | null): unknown {
  try {
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

/** The world to open straight on, or null. */
export async function readDirectLogin(read = besideThePage): Promise<ServerProfile | null> {
  if (!parseServerManifest(parseJson(await read('server.json')))?.directLogin) return null;
  return parseServerList((await read('serverlist.md')) ?? '')[0] ?? null;
}

/** `?direct` (also `?direct=1`): this launch opens on a full-download screen, then the server select. `?direct=0|off|false|no` is no. */
export function directRequested(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  const value = new URLSearchParams(search).get('direct');
  return value !== null && !['0', 'off', 'false', 'no'].includes(value.trim().toLowerCase());
}

/** `checked` once the boot's check answered (the preloader waits for it); `on` for the whole launch. */
export const DirectLogin = new (class {
  checked = false;

  /** `?direct`: the preloader page is `DirectLoadPage` (`ui/pages/preloader/directLoad.tsx`); no world is pinned. */
  readonly auto = directRequested();

  constructor() {
    makeAutoObservable(this);
  }

  get on(): boolean {
    return ServerConfig.pinned !== null;
  }
})();

/** Called once from `app/boot.tsx`. */
export async function checkDirectLogin(read = besideThePage): Promise<void> {
  const world = await readDirectLogin(read);
  runInAction(() => {
    if (world) ServerConfig.pin(world);
    DirectLogin.checked = true;
  });
}

/**
 * The channel a direct login takes in place of the picker: the first channel of the first game
 * server, the one the picker shows first, and the login line a click on it would set.
 */
export function directChannel(
  list: readonly { ServerId: number }[],
  published: readonly PublishedGameServer[]
): { serverId: number; selected: NonNullable<(typeof Servers)['selectedServer']> } | null {
  if (!list.length) return null;
  const serverId = Math.min(...list.map(s => s.ServerId));
  const named = published.find(g => g.id === serverId >> 8);
  return {
    serverId,
    selected: {
      name: named?.name || t('servers.serverName', { number: (serverId >> 8) + 1 }),
      channel: 1,
      channelName: named?.channels.find(c => c.id === (serverId & 0xff))?.name,
    },
  };
}
