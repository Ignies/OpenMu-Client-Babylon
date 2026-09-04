import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import { WS_HOST, WS_PORT } from '../consts';
import {
  isUsableHost,
  normalizeHost,
  normalizeWsUrl,
  ServerConfig,
  type ServerProfile,
} from './serverConfig';

/**
 * The published server list — a markdown file in the project's repository, one
 * server per line:
 *
 *     [VERSION:NAME:DESCRIPTION:LANGUAGE:IMAGE](host:port@WSPROXY)
 *
 * The version says which client that world is meant to be played with — the
 * token a `versions/<id>` folder gives as `gameVersion.listTag`, `S6EP3` for
 * the Season 6 Episode 3 build. It matters because the base game is compiled
 * against exactly one version, so a world asking for another is one this build
 * cannot enter, and saying so up front beats a protocol that falls apart after
 * the connect.
 *
 * Version, banner and proxy are all optional; a line carrying none of them is
 * the original three-field form and still parses.
 *
 * Fetched once per launch so a player who has never edited a setting still has
 * somewhere to play, and cached so the launch after that shows the same list
 * before the network answers (or without a network at all).
 *
 * It is fetched from `raw.githubusercontent.com`, not from the `blob/` page: a
 * blob URL serves GitHub's HTML and no CORS header, so the browser could not
 * read it even if it wanted to.
 *
 * The list is **untrusted text from the internet**. Every line goes through the
 * same normalisers a typed field does, and a line that does not parse is
 * dropped rather than repaired — a list nobody can edit into a broken client is
 * worth more than one that shows every row.
 */

const CACHE_KEY = 'mu_serverlist';

const DEFAULT_LIST_URL =
  'https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/serverlist.md';

/** Refuse to parse a list that is not a list — a login page, an error blob. */
const MAX_BYTES = 64 * 1024;

/** Enough for any real list; a longer file is a mistake or an attack. */
const MAX_ENTRIES = 50;

const MAX_FIELD = 60;

/**
 * The label and the target, split apart. The blurb may hold colons, so the name
 * is the first field and the language the last before the image; everything
 * between is the description.
 */
const LINE_RE = /^\s*\[([^\]]+)\]\(\s*([^)\s]+)\s*\)\s*$/;

/**
 * The target: `host:port`, and optionally `@` and the proxy that reaches it.
 * The proxy is a URL with colons of its own, so a colon cannot also be what
 * separates it from the server — `@` reads as "this server, at that proxy" and
 * cannot be mistaken for part of either address.
 */
const TARGET_RE = /^([^:\s@]+):(\d{1,5})(?:@(.+))?$/;

/**
 * A proxy address and nothing else: a ws scheme, a host, an optional port. No
 * path, query or credentials — the socket appends its own `?host=&port=`, so a
 * line asking for more is asking for something this client does not do.
 *
 * The scheme is required rather than defaulted. `normalizeWsUrl` would read a
 * bare host as one, but this is somebody else's text: a field that does not say
 * what it is gets dropped, like every other field here.
 */
const WS_RE = /^wss?:\/\/[A-Za-z0-9._-]+(?::\d{1,5})?\/?$/i;

/**
 * The version token a line may put first: which client that world expects to
 * be played with (`S6EP3`, and whatever a future `versions/<id>` calls itself
 * in `gameVersion.listTag`).
 *
 * It is optional, and a line that omits it still parses — so the field has to
 * be told apart from the name that used to be first. A version token is short,
 * unspaced, and contains a digit; server names in practice do not (`Test-Server`
 * has a hyphen, `Aida` has no digit). The cost of the guess is bounded either
 * way: a name mistaken for a version leaves the world unplayable-looking rather
 * than mis-addressed, and the fix is to publish the version field.
 */
const VERSION_RE = /^(?=.*\d)[A-Za-z0-9.]{2,12}$/;

export type ServerListState = 'idle' | 'loading' | 'ok' | 'error';

/** `?list=<url>` points the client at another list; `?list=off` skips it. */
function listUrl(): string | null {
  const fromEnv = import.meta.env.VITE_SERVER_LIST_URL as string | undefined;

  if (typeof location === 'undefined') return fromEnv || DEFAULT_LIST_URL;

  const param = new URLSearchParams(location.search).get('list');

  if (param === 'off') return null;
  if (param) return param;

  return fromEnv || DEFAULT_LIST_URL;
}

const trimField = (value: string) => value.trim().slice(0, MAX_FIELD);

/** A banner is a URL, and an absurdly long one is not. */
const MAX_IMAGE_URL = 2048;

const IMAGE_RE = /^https?:\/\/[^\s"'<>]+$/i;

/**
 * The image field is a URL, so it carries colons of its own: `https://…` splits
 * into `https` and `//…`. The banner therefore starts at the field that is
 * exactly a scheme followed by one that starts with `//`, and runs to the end
 * of the line. A blurb that merely mentions http is not mistaken for one.
 */
function splitImage(fields: string[]): { fields: string[]; image: string } {
  const at = fields.findIndex(
    (field, i) =>
      i > 0 &&
      /^\s*https?\s*$/i.test(field) &&
      fields[i + 1]?.trimStart().startsWith('//')
  );

  if (at < 0) return { fields, image: '' };

  const image = fields.slice(at).join(':').trim().slice(0, MAX_IMAGE_URL);

  return {
    fields: fields.slice(0, at),
    image: IMAGE_RE.test(image) ? image : '',
  };
}

/**
 * One line to a profile, or null. Exported for the parser's own tests — the
 * shape of somebody's markdown is exactly the thing worth pinning down.
 */
export function parseServerLine(line: string): ServerProfile | null {
  const match = LINE_RE.exec(line);

  if (!match) return null;

  const { fields: raw, image } = splitImage(match[1].split(':'));
  const withVersion = raw.map(trimField);
  const version = VERSION_RE.test(withVersion[0] ?? '') ? withVersion[0] : '';
  const fields = version ? withVersion.slice(1) : withVersion;

  if (fields.length < 2) return null;

  const name = fields[0];
  const language = fields.length > 2 ? fields[fields.length - 1] : '';
  const description = fields
    .slice(1, fields.length > 2 ? -1 : undefined)
    .join(': ');

  const target = TARGET_RE.exec(match[2]);

  if (!target) return null;

  const host = normalizeHost(target[1]);
  const port = Number(target[2]);
  const proxy = (target[3] ?? '').trim();

  if (!name || !isUsableHost(host)) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return {
    // Stable across refreshes, so a selected server stays selected: the list
    // has no ids of its own, and its host and port are what identify a server.
    id: `list:${host}:${port}`,
    name,
    csHost: host,
    csPort: port,
    // The proxy the line names, or this client's own (the build default, or
    // whatever the deployment set) when it names none. A published world is
    // reached through the proxy it was published with — the older two-field
    // target simply says nothing about one.
    wsUrl: normalizeWsUrl(WS_RE.test(proxy) ? proxy : `${WS_HOST}:${WS_PORT}`),
    gsAddress: 'auto',
    listed: true,
    ...(version && { version }),
    ...(description && { description }),
    ...(language && { language }),
    ...(image && { image }),
  };
}

export function parseServerList(text: string): ServerProfile[] {
  const seen = new Set<string>();
  const entries: ServerProfile[] = [];

  for (const line of text.split(/\r?\n/)) {
    const profile = parseServerLine(line);

    if (!profile || seen.has(profile.id)) continue;

    seen.add(profile.id);
    entries.push(profile);

    if (entries.length >= MAX_ENTRIES) break;
  }

  return entries;
}

class ServerListStore {
  state: ServerListState = 'idle';

  /** Why the last fetch failed, for the picker's note line. */
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  set(state: ServerListState, error: string | null = null): void {
    runInAction(() => {
      this.state = state;
      this.error = error;
    });
  }
}

export const ServerList = new ServerListStore();

/**
 * Fetches the list and hands it to `ServerConfig`. Never throws and never
 * blocks anything: an unreachable list leaves the player with their saved
 * servers, which is exactly where they were before it existed.
 */
export async function refreshServerList(): Promise<void> {
  // The cached copy first, so the picker is populated on the frame it opens.
  const cached = LocalStorage.load(CACHE_KEY);

  if (cached) ServerConfig.setListed(parseServerList(cached));

  const url = listUrl();

  if (!url) return;

  ServerList.set('loading');

  try {
    const response = await fetch(url, { cache: 'no-cache' });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = (await response.text()).slice(0, MAX_BYTES);
    const entries = parseServerList(text);

    ServerConfig.setListed(entries);
    LocalStorage.save(CACHE_KEY, text);
    ServerList.set('ok');
  } catch (e) {
    // Offline, blocked, moved, rewritten as something that is not a list: the
    // saved servers still work, so this is a note in the picker, not an error
    // anyone has to act on.
    console.warn(`server list (${url}) not read:`, e);
    ServerList.set('error', e instanceof Error ? e.message : String(e));
  }
}
