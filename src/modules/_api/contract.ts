// The module API: what a module may ask of the client (readme.md). Imports nothing, so a streamed
// module and the sandbox side can import this file alone.

/** The API version this client serves (semver): a minor bump adds calls, a major one breaks them. */
export const MODULE_API_VERSION = '1.0.0';

/** A tile of the hero's map. */
export type Tile = { readonly x: number; readonly y: number };

/** The hero as a module sees him: a copy, taken when asked. `map` is -1 before the world exists. */
export type HeroSnapshot = Readonly<{ name: string; class: number; level: number; map: number; x: number; y: number }>;

/** One window a module adds. */
export type ModuleWindow<Draw = never> = {
  /** Unique within the module. */
  id: string;
  /** A text key the module registered. */
  title: string;
  /** A `KeyboardEvent.code` that opens and closes it; a key a built-in action uses stays with the action. */
  hotKey?: string;
  /** In process: the React component drawn in the frame. In the sandbox there is none: the module's frame is the window. */
  draw?: Draw;
};

/**
 * Module API v1, as a module calls it in process. Text keys and window titles start with the module's
 * id and a dot. Packets are not in v1 (phase 4 adds them as a minor version).
 */
export interface ModuleApi<Draw = never> {
  /** Adds or replaces lines of one language (`en` is the one every module needs). */
  registerText(code: string, strings: Readonly<Record<string, string>>): void;
  registerWindow(window: ModuleWindow<Draw>): void;
  /** Plays a sound of the client's catalogue by key (`Sound/...`), not positioned. */
  playSound(id: string): void;
  /** Plays an effect the fx controller knows by name at a tile of the hero's map. */
  playEffect(id: string, at: Tile): void;
  hero(): HeroSnapshot;
  /** Called with the map's number once the hero stands on a new map. Returns the unsubscribe. */
  onMapChange(fn: (map: number) => void): () => void;
}

/** The same calls over messages (the sandbox): each answers with a promise; `onMapChange` unsubscribes at once. */
export type RemoteModuleApi = {
  [K in Exclude<keyof ModuleApi, 'onMapChange'>]: (...args: Parameters<ModuleApi[K]>) => Promise<ReturnType<ModuleApi[K]>>;
} & Pick<ModuleApi, 'onMapChange'>;

type Version = readonly [number, number, number];

const NUMBER = /^(0|[1-9]\d*)$/;

/** `1.2.3`, `1.2`, `1.x`: the numbers given (the rest 0) and whether it ends in `x`. */
function parse(text: string): { v: Version; given: number; wild: boolean } | null {
  const parts = text.split('.');
  let given = 0;
  while (given < parts.length && given < 3 && NUMBER.test(parts[given])) given++;
  if (given === 0 || parts.length > 3 || parts.slice(given).some(p => p !== 'x')) return null;
  const n = (i: number) => (i < given ? Number(parts[i]) : 0);
  return { v: [n(0), n(1), n(2)], given, wild: given < parts.length };
}

/** `v` with part `i` one higher and the parts after it 0. */
const bump = (v: Version, i: number): Version =>
  i === 0 ? [v[0] + 1, 0, 0] : i === 1 ? [v[0], v[1] + 1, 0] : [v[0], v[1], v[2] + 1];

const compare = (a: Version, b: Version) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** The versions one range token allows, as [from, below), or null when the token is not one this client reads. */
function bounds(token: string): [Version, Version | null] | null {
  const op = (/^(\^|~|>=|>|<=|<)/.exec(token) ?? [''])[0];
  const p = parse(token.slice(op.length));
  if (!p || (op && p.wild) || (!op && !p.wild && p.given < 3)) return null;
  const { v, given } = p;
  const next = bump(v, given - 1);
  switch (op) {
    case '^': {
      let i = 0;
      while (i < given - 1 && v[i] === 0) i++;
      return [v, bump(v, i)];
    }
    case '~':
      return [v, bump(v, given > 1 ? 1 : 0)];
    case '>=':
      return [v, null];
    case '>':
      return [next, null];
    case '<':
      return [[0, 0, 0], v];
    case '<=':
      return [[0, 0, 0], next];
    default:
      return [v, next];
  }
}

/**
 * Whether this client's API version satisfies a module's range: `^1.2`, `~1.2.3`, `1.x`, an exact
 * `1.2.3`, or comparators that must all hold (`>=1.1 <2`). Anything else is refused.
 */
export function canServe(range: string, version: string = MODULE_API_VERSION): boolean {
  const have = parse(version);
  if (typeof range !== 'string' || !have || have.given < 3) return false;
  return range.split(' ').every(token => {
    const b = bounds(token);
    return !!b && compare(have.v, b[0]) >= 0 && (!b[1] || compare(have.v, b[1]) < 0);
  });
}
