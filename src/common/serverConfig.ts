import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import { CS_HOST, CS_PORT, WS_HOST, WS_PORT } from '../consts';
import { versionByTag } from '../version';

/**
 * Where the client connects: one editable list of server profiles, the one
 * that is selected, and the rules that turn a profile into the two addresses
 * the sockets actually need.
 *
 * Three layers, highest first:
 *
 *   1. the URL (`?cs=host:port`, `?ws=wss://host:port`, `?server=<name>`) —
 *      an ephemeral profile, never saved, so a link can point a build at a
 *      server without touching what the player has stored;
 *   2. the saved profiles (localStorage) — what the in-client picker edits;
 *   3. the build defaults (`VITE_CS_HOST/PORT`, `VITE_WS_HOST/PORT` via
 *      consts.ts) — the seed of the first profile on a fresh install.
 *
 * Note what the ws address is *not*: a browser cannot open a TCP socket, so
 * every connection goes through the ws↔TCP proxy (`proxy/main.ts`), which
 * dials `?host=&port=` for us. `wsUrl` is therefore the proxy's own address,
 * and `csHost:csPort` is the MU connect server as seen **from the proxy's
 * network** — they have no reason to be the same machine.
 */

const SERVERS_KEY = 'mu_servers';

/** The pre-profile config blob (store.ts `CONFIG_KEY`), read once to migrate. */
const LEGACY_KEY = '_mu_key';

export type GameServerPolicy =
  /** Use the address `ConnectionInfo` returns; fall back to `csHost`. */
  | 'auto'
  /** Ignore it and always reconnect to `csHost` (single-box setups). */
  | 'csHost';

export type ServerProfile = {
  /** Stable key; `URL_PROFILE_ID` for the ephemeral URL override. */
  id: string;
  /** What the picker shows. Free text, never parsed. */
  name: string;
  /** Connect-server host, no scheme — the proxy resolves it, not the browser. */
  csHost: string;
  csPort: number;
  /** Proxy origin, scheme included (`ws://localhost:3000`, `wss://play.x.com`). */
  wsUrl: string;
  gsAddress: GameServerPolicy;
  /** From the published list (`serverList.ts`): shown, selectable, not editable. */
  listed?: boolean;
  /** The published list's blurb, language tag and banner. Display only. */
  description?: string;
  language?: string;
  image?: string;
  /**
   * Which client this world expects (`gameVersion.listTag`, e.g. `S6EP3`), as
   * the published line gave it. Empty on a saved profile: the player typed the
   * address, so it is played with whatever version this client picks.
   */
  version?: string;
};

export const URL_PROFILE_ID = 'url';

/** MU's default connect-server port, used when `?cs=` omits one. */
const DEFAULT_CS_PORT = 44405;

const MAX_PORT = 65535;

/**
 * Addresses a connect server can hand back that mean "no address": OpenMU and
 * most season-6 servers pad the 16-byte field, and a misconfigured one sends
 * the unspecified address rather than an empty string. Anything here falls
 * back to `csHost` even under the `auto` policy.
 */
const UNUSABLE_HOSTS = new Set(['', '0.0.0.0', '255.255.255.255', 'null']);

/** Hostnames/IPs only — no scheme, path, credentials or spaces. */
const HOST_RE = /^[A-Za-z0-9._-]+$/;

function clampPort(value: unknown, fallback: number): number {
  const port = Math.trunc(Number(value));

  return Number.isFinite(port) && port > 0 && port <= MAX_PORT ? port : fallback;
}

/** Strip a scheme, a path and a trailing dot a user may have pasted in. */
export function normalizeHost(raw: string): string {
  return raw
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isUsableHost(raw: string): boolean {
  const host = normalizeHost(raw);

  return host.length > 0 && !UNUSABLE_HOSTS.has(host.toLowerCase()) && HOST_RE.test(host);
}

/**
 * A page served over https may not open a `ws://` socket — the browser blocks
 * it as mixed content, with an error the player cannot act on. Default the
 * scheme to the page's, and upgrade a bare `ws://` typed into an https build.
 */
function defaultWsScheme(): 'ws' | 'wss' {
  return typeof location !== 'undefined' && location.protocol === 'https:'
    ? 'wss'
    : 'ws';
}

export function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');

  if (!trimmed) return '';

  const scheme = defaultWsScheme();
  const withScheme = /^wss?:\/\//i.test(trimmed)
    ? trimmed
    : `${scheme}://${trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')}`;

  return scheme === 'wss' ? withScheme.replace(/^ws:\/\//i, 'wss://') : withScheme;
}

/** True when this proxy address will be blocked as mixed content. */
export function isInsecureWsUrl(url: string): boolean {
  return (
    typeof location !== 'undefined' &&
    location.protocol === 'https:' &&
    /^ws:\/\//i.test(url.trim())
  );
}

/**
 * What the picker writes while the player types: stored as typed, so a
 * half-finished host (`127.`) or a cleared port is not rewritten under the
 * cursor. `effective` is what normalizes it, at connect time.
 */
export function draftProfile(
  patch: Partial<ServerProfile>,
  base: ServerProfile
): ServerProfile {
  const port = Math.trunc(Number(patch.csPort ?? base.csPort));

  return {
    id: base.id,
    name: patch.name ?? base.name,
    csHost: patch.csHost ?? base.csHost,
    // 0 (an emptied field) is kept and read as "the default port".
    csPort: Number.isFinite(port) ? Math.min(Math.max(port, 0), MAX_PORT) : 0,
    wsUrl: patch.wsUrl ?? base.wsUrl,
    gsAddress: patch.gsAddress ?? base.gsAddress,
  };
}

/** The strict pass: storage, the URL override and a new profile go through it. */
export function sanitizeProfile(
  patch: Partial<ServerProfile>,
  base: ServerProfile
): ServerProfile {
  const csHost = normalizeHost(patch.csHost ?? base.csHost);

  return {
    id: patch.id ?? base.id,
    name: (patch.name ?? base.name).trim() || base.name,
    csHost: csHost || base.csHost,
    csPort: clampPort(patch.csPort ?? base.csPort, base.csPort),
    wsUrl: normalizeWsUrl(patch.wsUrl ?? base.wsUrl) || base.wsUrl,
    gsAddress: patch.gsAddress ?? base.gsAddress,
    ...((patch.listed ?? base.listed) && { listed: true }),
    ...((patch.description ?? base.description) && {
      description: patch.description ?? base.description,
    }),
    ...((patch.language ?? base.language) && {
      language: patch.language ?? base.language,
    }),
    ...((patch.image ?? base.image) && { image: patch.image ?? base.image }),
    ...((patch.version ?? base.version) && {
      version: patch.version ?? base.version,
    }),
  };
}

/**
 * Can this client enter that world? It can when it carries the version the
 * world asked for - `versions/registry.ts`, which is where the versions this
 * client ships are enumerated and where the answer widens as `versions/` grows.
 *
 * A world that named no version is always played: the older list lines say
 * nothing, and neither does an address the player typed themselves.
 */
export function playableHere(profile: ServerProfile): boolean {
  return !profile.version || versionByTag(profile.version) !== null;
}

function defaultProfile(): ServerProfile {
  return {
    id: 'local',
    name: 'Local (OpenMU)',
    csHost: CS_HOST,
    csPort: CS_PORT,
    wsUrl: normalizeWsUrl(`${WS_HOST}:${WS_PORT}`),
    // The build defaults describe one machine running OpenMU and the proxy,
    // where the returned address is that same box either way.
    gsAddress: 'auto',
  };
}

/**
 * Whether a fresh install gets that profile at all.
 *
 * It is seeded when the build names a connect server of its own, and when the
 * page is being served off the machine it describes — a developer's checkout,
 * where `127.0.0.1:44405` is a server that is really there.
 *
 * A client served from a host gets neither: its worlds come from the published
 * list, and seeding the loopback default there puts a row in front of every
 * player that none of them can play and only the owner understands.
 */
function seedsDefaultProfile(): boolean {
  if (!isLoopback(CS_HOST)) return true;
  if (typeof location === 'undefined') return true;

  return isLoopback(location.hostname) || location.protocol === 'file:';
}

/**
 * What `active` answers when there is nothing to be active — no saved profile,
 * no published world, no URL. It is never saved and never shown: the screens
 * ask `isEmpty` first. It exists so the sockets and the picker keep reading a
 * profile instead of a null.
 */
const NO_WORLD = defaultProfile();

/**
 * The endpoints the pre-profile client kept in its config blob. Carried over
 * so an existing install keeps connecting where it did, then left alone —
 * store.ts no longer writes those four keys.
 */
function legacyProfile(): ServerProfile | null {
  try {
    const raw = LocalStorage.load(LEGACY_KEY);

    if (!raw) return null;

    const data = JSON.parse(raw) as {
      csIp?: string;
      csPort?: number;
      wsHost?: string;
      wsPort?: number;
    };

    if (!data.csIp && !data.wsHost) return null;

    const base = defaultProfile();

    return sanitizeProfile(
      {
        csHost: data.csIp,
        csPort: data.csPort,
        wsUrl:
          data.wsHost && `${data.wsHost}:${data.wsPort ?? WS_PORT}`,
        // What the old client did unconditionally (logic.ts reconnected to
        // `config.csIp`), kept for the profile it is migrating.
        gsAddress: 'csHost',
      },
      base
    );
  } catch {
    return null;
  }
}

type StoredState = {
  profiles: ServerProfile[];
  activeId: string;
  /** The last world actually entered, which is not the last one clicked on. */
  lastPlayedId?: string;
};

function load(): StoredState {
  const fallback = (): StoredState => {
    const profile =
      legacyProfile() ?? (seedsDefaultProfile() ? defaultProfile() : null);

    return profile
      ? { profiles: [profile], activeId: profile.id }
      : { profiles: [], activeId: '' };
  };

  const stored = LocalStorage.load(SERVERS_KEY);

  if (!stored) return fallback();

  try {
    const data = JSON.parse(stored) as Partial<StoredState>;
    const base = defaultProfile();
    const profiles = (data.profiles ?? [])
      .filter((p): p is ServerProfile => !!p && typeof p === 'object')
      .map(p => sanitizeProfile(p, { ...base, id: p.id || base.id }));

    // Saving nothing is a state of its own on a client whose worlds come from
    // the published list, so an empty array is kept rather than re-seeded — and
    // the selection is kept as written, because it may name a listed world that
    // this launch has not fetched yet. `active` falls back until it arrives.
    const activeId =
      typeof data.activeId === 'string'
        ? data.activeId
        : (profiles[0]?.id ?? '');

    // Kept as written even when nothing here matches it: the world last played
    // may be a listed one, and the list has not been fetched yet.
    const lastPlayedId =
      typeof data.lastPlayedId === 'string' ? data.lastPlayedId : undefined;

    return { profiles, activeId, lastPlayedId };
  } catch {
    return fallback();
  }
}

/**
 * The URL override, parsed once. `?cs=` / `?ws=` / `?version=` build a profile
 * of their own; `?server=` only selects a saved one, by id or
 * (case-insensitive) name.
 */
function urlOverride(saved: StoredState): {
  profile: ServerProfile | null;
  selectId: string | null;
} {
  if (typeof location === 'undefined') return { profile: null, selectId: null };

  const params = new URLSearchParams(location.search);
  const cs = params.get('cs');
  const ws = params.get('ws');
  // The client version tag (`versions/registry.ts` listTag). A world the
  // published list has not tagged yet, or a version being tried out, can be
  // entered with it; an unknown tag falls back to the default version.
  const version = params.get('version');
  const wanted = params.get('server')?.trim().toLowerCase();

  const selectId =
    saved.profiles.find(
      p => p.id === wanted || p.name.toLowerCase() === wanted
    )?.id ?? null;

  if (!cs && !ws && !version) return { profile: null, selectId };

  const base = saved.profiles.find(p => p.id === selectId) ?? saved.profiles[0];
  const [csHost, csPort] = (cs ?? '').split(':');

  return {
    profile: sanitizeProfile(
      {
        id: URL_PROFILE_ID,
        name: 'From URL',
        csHost: cs ? csHost : undefined,
        csPort: cs ? clampPort(csPort, DEFAULT_CS_PORT) : undefined,
        wsUrl: ws ?? undefined,
        version: version ?? undefined,
        gsAddress: params.get('gs') === 'cs' ? 'csHost' : base.gsAddress,
      },
      base
    ),
    selectId,
  };
}

class ServerConfigStore {
  profiles: ServerProfile[];

  /**
   * Servers from the published list (`serverList.ts`), refreshed at launch.
   * Kept apart from `profiles` because they are someone else's rows: they are
   * never saved, never edited, and disappear again when the list drops them.
   */
  listed: ServerProfile[] = [];

  activeId: string;

  /** The last world entered, not the last one clicked. Empty on a fresh install. */
  lastPlayedId: string;

  /** Set by `?cs=`/`?ws=`: wins over the selection, is never saved. */
  readonly urlProfile: ServerProfile | null;

  constructor() {
    const saved = load();
    const { profile, selectId } = urlOverride(saved);

    this.profiles = saved.profiles;
    this.activeId = selectId ?? saved.activeId;
    this.lastPlayedId = saved.lastPlayedId ?? '';
    this.urlProfile = profile;

    makeAutoObservable(this);
  }

  /**
   * Everything the picker offers: what the player saved, then the list — with
   * the world they last played pulled to the front, wherever it came from. The
   * one you keep going back to should not be on page three.
   */
  get all(): ServerProfile[] {
    const rows = [...this.profiles, ...this.listed];
    const at = rows.findIndex(p => p.id === this.lastPlayedId);

    return at > 0 ? [rows[at], ...rows.slice(0, at), ...rows.slice(at + 1)] : rows;
  }

  /** The languages the offered worlds are tagged with, for the picker's filter. */
  get languages(): string[] {
    const tags = new Set<string>();

    for (const world of this.all) {
      if (world.language) tags.add(world.language.toLowerCase());
    }

    return [...tags].sort();
  }

  /** The profile every connection is made from. */
  get active(): ServerProfile {
    return (
      this.urlProfile ??
      this.all.find(p => p.id === this.activeId) ??
      this.all[0] ??
      NO_WORLD
    );
  }

  /**
   * There is nowhere to play: nothing saved, nothing published, no URL. A
   * hosted client is in this state until its list arrives, and stays there if
   * the list cannot be read — so the screens say so rather than offering the
   * placeholder `active` hands them.
   */
  get isEmpty(): boolean {
    return !this.urlProfile && this.all.length === 0;
  }

  /** True while the URL pins the endpoints, so the picker shows them read-only. */
  get lockedByUrl(): boolean {
    return this.urlProfile != null;
  }

  /** A listed server is shown as it was published; `add()` makes it editable. */
  get activeIsListed(): boolean {
    return !!this.active.listed;
  }

  /**
   * True when the fields belong to something the player may not edit — a URL
   * override, a published row, or, with nothing to play at all, the placeholder
   * standing in for one. Typing into that last one would write nowhere; Add is
   * the way out of it, and makes a profile that does save.
   */
  get readOnly(): boolean {
    return this.lockedByUrl || this.activeIsListed || this.isEmpty;
  }

  /**
   * The published list arrived. The selection is left alone: an id that is not
   * in the list yet (a saved one, or a listed one this fetch dropped) already
   * falls back to the first saved profile in `active`.
   */
  setListed(entries: ServerProfile[]): void {
    runInAction(() => {
      this.listed = entries;
    });
  }

  private save(): void {
    LocalStorage.save(
      SERVERS_KEY,
      JSON.stringify({
        profiles: this.profiles,
        activeId: this.activeId,
        lastPlayedId: this.lastPlayedId,
      })
    );
  }

  /**
   * That world was entered, not merely looked at. The URL profile is skipped:
   * it is a link somebody followed once, and it is gone next launch anyway.
   */
  markPlayed(id: string): void {
    if (id === URL_PROFILE_ID) return;

    runInAction(() => {
      this.lastPlayedId = id;
    });
    this.save();
  }

  select(id: string): void {
    if (!this.all.some(p => p.id === id)) return;

    runInAction(() => {
      this.activeId = id;
    });
    this.save();
  }

  update(id: string, patch: Partial<ServerProfile>): void {
    const index = this.profiles.findIndex(p => p.id === id);

    if (index < 0) return;

    runInAction(() => {
      this.profiles[index] = draftProfile(patch, this.profiles[index]);
    });
    this.save();
  }

  /**
   * A new saved server, copied from whatever is selected. That is how a listed
   * server becomes editable: pick it, add it, and the copy is yours — with the
   * list's own marks (`listed`, its blurb and language) stripped off.
   */
  add(from?: Partial<ServerProfile>): ServerProfile {
    const base = this.active ?? defaultProfile();
    const profile = sanitizeProfile(
      {
        ...from,
        id: `s${Date.now().toString(36)}`,
        listed: false,
        description: '',
        language: '',
        image: '',
        // The copy is the player's own address, so it is whatever this build
        // is — not whatever the line it came from asked for.
        version: '',
      },
      { ...base, name: base.listed ? base.name : 'New server' }
    );

    runInAction(() => {
      this.profiles.push(profile);
      this.activeId = profile.id;
    });
    this.save();

    return profile;
  }

  /** Removing the last profile is a no-op: there is always one to connect with. */
  remove(id: string): void {
    if (this.profiles.length < 2) return;

    runInAction(() => {
      this.profiles = this.profiles.filter(p => p.id !== id);
      if (!this.profiles.some(p => p.id === this.activeId)) {
        this.activeId = this.profiles[0].id;
      }
    });
    this.save();
  }

  reset(): void {
    const profile = defaultProfile();

    runInAction(() => {
      this.profiles = [profile];
      this.activeId = profile.id;
    });
    this.save();
  }
}

export const ServerConfig = new ServerConfigStore();

/**
 * A profile as the sockets will use it: the typed text normalized, with the
 * build defaults standing in for anything left empty. Every connection and the
 * picker's preview line read this, so what the player is shown is exactly what
 * will be dialled.
 */
export function effective(profile: ServerProfile = ServerConfig.active): {
  csHost: string;
  csPort: number;
  wsUrl: string;
} {
  const fallback = defaultProfile();

  return {
    csHost: normalizeHost(profile.csHost) || fallback.csHost,
    csPort: clampPort(profile.csPort, fallback.csPort),
    wsUrl: normalizeWsUrl(profile.wsUrl) || fallback.wsUrl,
  };
}

/** Proxy origin the sockets open (`createSocket`'s `wsAddress`). */
export function wsAddress(): string {
  return effective().wsUrl;
}

/** Connect server, as the proxy will dial it. */
export function connectServerAddress(): { host: string; port: number } {
  const { csHost, csPort } = effective();

  return { host: csHost, port: csPort };
}

/**
 * The address to *show* for a world, which is not always the one it is dialled
 * at.
 *
 * A published world's `csHost` is the connect server as its own proxy reaches
 * it, and a world whose proxy shares a box with the game server publishes
 * `127.0.0.1` there — correct, and meaningless on a player's screen. So a
 * listed world shows the proxy that carries it, which is the address the
 * browser really opens and the only one that means anything from outside.
 *
 * A saved profile shows its endpoint unchanged: the player typed it, and it is
 * the field they are checking when they read this line.
 */
export function displayAddress(
  profile: ServerProfile = ServerConfig.active
): string {
  const { csHost, csPort, wsUrl } = effective(profile);

  if (!profile.listed) return `${csHost}:${csPort}`;

  return normalizeHost(wsUrl) || `${csHost}:${csPort}`;
}

/**
 * Where a host sits: the client cannot probe reachability, but it can tell a
 * public address from one that only means something inside a network — which
 * is enough to know when a server is describing itself to the internet rather
 * than to us.
 */

/** 127.0.0.0/8 and the names for it. The proxy and the server are one machine. */
function isLoopback(host: string): boolean {
  const lower = host.toLowerCase();

  return (
    lower === 'localhost' ||
    lower === '::1' ||
    lower.endsWith('.localhost') ||
    /^127\./.test(lower)
  );
}

/**
 * True when the wider internet could route to this address — a public IPv4, or
 * any qualified hostname (a name resolves to whatever its DNS says, so it is
 * assumed routable). False for loopback, RFC1918 / CGNAT / link-local space,
 * single-label names and the local-network suffixes.
 */
function isPublicAddress(host: string): boolean {
  const lower = host.toLowerCase();

  if (isLoopback(lower)) return false;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);

  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);

    if (a === 10 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    // CGNAT (100.64/10) and link-local (169.254/16) are no more routable to us
    // than RFC1918 space.
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;

    return true;
  }

  // `mu-server`, `openmu.local`, `box.lan` — names only a local resolver knows.
  if (!lower.includes('.')) return false;

  return !/\.(local|lan|home|internal|localdomain)$/.test(lower);
}

/**
 * Where the game-server socket goes, and where it goes if that fails.
 *
 * `ConnectionInfo` carries the address the server wants us on — right for a
 * real deployment, where the game servers are separate boxes. But the address a
 * server advertises is how it believes the *internet* reaches it, which is a
 * different question from how the proxy reaches it, and the two disagree in one
 * very common setup: a server on this machine, or on this network, announcing
 * the public IP of its router. OpenMU's demo does exactly that.
 *
 * So a public address is believed only when the connect server we just spoke to
 * was itself public. Reached OpenMU on `127.0.0.1` and it answers with a public
 * IP? That IP is this same machine seen from outside; going out to the router
 * and back — if the router even hairpins — is at best a slow way to reach a
 * server that is right here, so the loopback address is used at once. Two
 * private addresses, on the other hand, are two boxes on one network: believed.
 *
 * Every such judgement is a guess about someone else's network, so it is never
 * final: `fallback` is the address that lost, and the store tries it if the
 * winner does not answer. Whichever way the guess goes, both get a turn.
 */
export function gameServerTarget(returned: string): {
  host: string;
  fallback: string | null;
} {
  const { csHost } = effective();
  const address = isUsableHost(returned) ? normalizeHost(returned) : '';

  if (ServerConfig.active.gsAddress === 'csHost' || !address) {
    return { host: csHost, fallback: null };
  }

  if (address === csHost) return { host: csHost, fallback: null };

  // The advertised address describes the wider internet, while the connect
  // server that just answered us does not: prefer what demonstrably works, and
  // keep the advertised one as the second try.
  if (isPublicAddress(address) && !isPublicAddress(csHost)) {
    return { host: csHost, fallback: address };
  }

  return { host: address, fallback: csHost };
}
