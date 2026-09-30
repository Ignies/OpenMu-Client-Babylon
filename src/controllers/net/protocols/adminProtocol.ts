/**
 * What the proxy's tracker tells a game master's panel, and what the panel
 * asks back (documentation/admin_console/ARCHITECTURE.md).
 *
 * Shared by `proxy/track/*` and `src/admin/*`, so it imports nothing: the
 * proxy runs under Bun with no engine, and the panel must not pull proxy
 * code into the client bundle.
 */

/** Where the proxy upgrades a game master's stream, on its public port. */
export const ADMIN_STREAM_PATH = '/admin/stream';

/**
 * The stream's address for the proxy the sockets already dial. `wsAddress`
 * is an origin without a path (`normalizeWsUrl` strips the slash), and the
 * nonce travels the way `createSocket` sends it on the game socket.
 */
export function adminStreamUrl(wsAddress: string, nonce: string): string {
  return `${wsAddress.replace(/\/+$/, '')}${ADMIN_STREAM_PATH}?session=${nonce}`;
}

export type EventKind =
  | 'login'
  | 'logout'
  | 'select'
  | 'map'
  | 'walk'
  | 'teleport'
  | 'warp'
  | 'chat'
  | 'whisper'
  | 'party'
  | 'guild'
  | 'shout'
  | 'command'
  | 'attack'
  | 'skill'
  | 'kill'
  | 'death'
  | 'exp'
  | 'level'
  | 'state'
  | 'pickup'
  | 'drop'
  | 'item'
  | 'money'
  | 'buy'
  | 'sell'
  | 'repair'
  | 'npc'
  | 'trade'
  | 'shop'
  | 'server'
  | 'band';

/** Every kind, in the order a filter row lists them. */
export const EVENT_KINDS: readonly EventKind[] = [
  'login',
  'logout',
  'select',
  'map',
  'walk',
  'teleport',
  'warp',
  'chat',
  'whisper',
  'party',
  'guild',
  'shout',
  'command',
  'attack',
  'skill',
  'kill',
  'death',
  'exp',
  'level',
  'state',
  'pickup',
  'drop',
  'item',
  'money',
  'buy',
  'sell',
  'repair',
  'npc',
  'trade',
  'shop',
  'server',
  'band',
];

/** One thing a character did or had done to it. */
export type TrackEvent = {
  /** The journal's row id; absent on a live line that was not stored. */
  id?: number;
  at: number;
  account: string | null;
  character: string | null;
  kind: EventKind;
  /** Plain English, rendered at the proxy so a log reads without the client's tables. */
  text: string;
  data?: Record<string, unknown>;
};

/** One socket's player as the tracker knows it. */
export type TrackedPlayer = {
  /** Stable for the socket's life; a name can be on two sockets in a row. */
  id: string;
  account: string | null;
  character: string | null;
  /** `CharacterClassNumber`; null before a character is picked. */
  cls: number | null;
  level: number;
  /** OpenMU map number; null at the character select. */
  map: number | null;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  money: number;
  /** `CharacterHeroState`; 3 is Normal. */
  heroState: number;
  gm: boolean;
  guild: string | null;
  /** The game server port the socket dialled. */
  port: number | null;
  /** When the socket opened. */
  since: number;
  /** The last packet seen in either direction. */
  lastSeen: number;
  /** The newest journal line's text, for the table. */
  lastAction: string | null;
};

export type AdminServerMessage =
  | { t: 'snapshot'; now: number; players: TrackedPlayer[] }
  | { t: 'player'; player: TrackedPlayer }
  | { t: 'move'; id: string; map: number | null; x: number; y: number }
  | { t: 'leave'; id: string }
  | { t: 'event'; id: string | null; event: TrackEvent }
  | { t: 'log'; reqId: number; character: string; events: TrackEvent[]; more: boolean }
  | { t: 'refused'; reason: RefusalReason }
  | { t: 'pong' };

export type RefusalReason = 'no-session' | 'not-gm' | 'origin';

export type LogQuery = {
  character: string;
  /** Only rows older than this timestamp (paging backwards). */
  before?: number;
  kinds?: EventKind[];
  limit?: number;
};

export type AdminClientMessage =
  | ({ t: 'log'; reqId: number } & LogQuery)
  | { t: 'ping' };

/** OpenMU `CharacterClassNumber` -> the class's name. */
export const CLASS_NAMES: Readonly<Record<number, string>> = {
  0: 'Dark Wizard',
  2: 'Soul Master',
  3: 'Grand Master',
  4: 'Dark Knight',
  6: 'Blade Knight',
  7: 'Blade Master',
  8: 'Fairy Elf',
  10: 'Muse Elf',
  11: 'High Elf',
  12: 'Magic Gladiator',
  13: 'Duel Master',
  16: 'Dark Lord',
  17: 'Lord Emperor',
  20: 'Summoner',
  22: 'Bloody Summoner',
  23: 'Dimension Master',
  24: 'Rage Fighter',
  25: 'Fist Master',
};

export function className(cls: number | null): string {
  if (cls === null) return '';
  return CLASS_NAMES[cls] ?? `Class ${cls}`;
}

/** `CharacterHeroState` names, the way the score panel and the log say them. */
export const HERO_STATE_NAMES: Readonly<Record<number, string>> = {
  0: 'New',
  1: 'Hero',
  2: 'Hero',
  3: 'Normal',
  4: 'Outlaw',
  5: 'Murderer',
  6: 'Murderer',
};

export function heroStateName(state: number): string {
  return HERO_STATE_NAMES[state] ?? `State ${state}`;
}
