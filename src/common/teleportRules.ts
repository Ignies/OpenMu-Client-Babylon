import { TW_ACTION, TW_HEIGHT, TW_SAFEZONE } from './terrain/consts';

/**
 * Teleport (6) and Teleport Ally (15): the rules the client checks before it
 * predicts a jump, and the bookkeeping that tells the server's late same-map
 * `MapChanged` apart from a refusal. Store-free so it can be tested.
 *
 * OpenMU answers a skill teleport about 1.8 s after the request
 * (PlayerMapTransitions.TeleportAsync: 300 ms, then 1500 ms) and refuses a
 * second one in that window with a `MapChanged` at the first square
 * (WizardTeleportAction.cs:34-51, `IsActive()` is false while teleporting).
 */

export interface Tile {
  x: number;
  y: number;
}

/** A pending request is dropped after this long without an answer. */
export const TELEPORT_PENDING_TIMEOUT = 3;
/** `GetTickCount() - g_dwLatestZoneMoving < 3000` (ClassAttack.cpp:1524). */
export const MAP_CHANGE_HOLD = 3;

/** Stone, Stun, Sleep, Freeze2 and Earth Binds (WizardTeleportAction.cs:18-25). */
export const TELEPORT_PREVENTING_EFFECTS: readonly number[] = [0x39, 0x3d, 0x48, 0x92, 0x93];

/** What a `MapChanged` means for the hero. */
export type MapChangeVerdict =
  /** A real map change (IsMapChange): the full warp treatment. */
  | 'warp'
  /** The server's answer to the pending teleport, on the square the hero asked for. */
  | 'confirm'
  /** The pending teleport refused: the server puts the hero back. */
  | 'refused'
  /** A same-map move nobody asked for (pulled by Teleport Ally, a GM move, a late reply). */
  | 'unasked';

export class TeleportGate {
  pending: { from: Tile; to: Tile; sentAt: number } | null = null;
  lastMapChange = -Infinity;

  begin(from: Tile, to: Tile, now: number): void {
    this.pending = { from: { ...from }, to: { ...to }, sentAt: now };
  }

  isPending(now: number): boolean {
    if (this.pending && now - this.pending.sentAt >= TELEPORT_PENDING_TIMEOUT) {
      this.pending = null;
    }
    return this.pending !== null;
  }

  /** Seconds since the last real map change. */
  sinceMapChange(now: number): number {
    return now - this.lastMapChange;
  }

  onMapChanged(isMapChange: boolean, x: number, y: number, now: number): MapChangeVerdict {
    const pending = this.isPending(now) ? this.pending : null;
    this.pending = null;
    if (isMapChange) {
      this.lastMapChange = now;
      return 'warp';
    }
    if (!pending) return 'unasked';
    return pending.to.x === x && pending.to.y === y ? 'confirm' : 'refused';
  }

  reset(): void {
    this.pending = null;
    this.lastMapChange = -Infinity;
  }
}

/** The hero's gate: one per client. */
export const teleportGate = new TeleportGate();

/**
 * Where Teleport may land. The original wants `Wall == 0` once TW_ACTION and
 * TW_HEIGHT are taken off (ClassAttack.cpp:1516-1519); OpenMU's walk map is
 * the raw attribute being 0 or 1 (GameMapTerrain.cs:184), and it refuses a
 * safe zone. A square only both accept is predicted.
 */
export function teleportSquareOpen(flag: number): boolean {
  const wall = flag & ~(TW_ACTION | TW_HEIGHT);
  return wall === 0 && openMuWalkable(flag);
}

/** Teleport Ally's square: `Wall == 0` with only TW_ACTION removed (ClassAttack.cpp:1454-1464), OpenMU's walk map on top. */
export function allySquareOpen(flag: number): boolean {
  return (flag & ~TW_ACTION) === 0 && openMuWalkable(flag);
}

function openMuWalkable(flag: number): boolean {
  return flag === 0 || flag === TW_SAFEZONE;
}

/** OpenMU's `IsInRange`: a square of `range` tiles around the object's own tile (LocateableExtensions.cs:103). */
export function inSquareRange(from: Tile, to: Tile, range: number): boolean {
  return Math.abs(to.x - from.x) <= range && Math.abs(to.y - from.y) <= range;
}

export interface TeleportCheck {
  /** The hero's own tile (corner-anchored: the floor of the position). */
  from: Tile;
  to: Tile;
  /** The skill's Distance. */
  range: number;
  /** The raw terrain attribute of `to`. */
  flag: number;
  heroInSafeZone: boolean;
  /** An effect in TELEPORT_PREVENTING_EFFECTS is on the hero. */
  disabled: boolean;
  holdingItem: boolean;
  /** A teleport is still waiting for its answer, or the last one is still fading in. */
  busy: boolean;
  sinceMapChange: number;
}

export type TeleportRefusal =
  | 'safeZone'
  | 'disabled'
  | 'holdingItem'
  | 'busy'
  | 'mapChange'
  | 'range'
  | 'blocked';

/** Why the server would refuse this Teleport, or null when it would take it. */
export function teleportRefusal(c: TeleportCheck): TeleportRefusal | null {
  if (c.heroInSafeZone) return 'safeZone';
  if (c.disabled) return 'disabled';
  if (c.holdingItem) return 'holdingItem';
  if (c.busy) return 'busy';
  if (c.sinceMapChange < MAP_CHANGE_HOLD) return 'mapChange';
  if (!inSquareRange(c.from, c.to, c.range)) return 'range';
  if (!teleportSquareOpen(c.flag)) return 'blocked';
  return null;
}

/**
 * Teleport Ally's landing square (ClassAttack.cpp:1437-1467): a random one of
 * the eight around the caster whose wall is clear. Ten blocked draws give up.
 */
export function pickAllySquare(
  caster: Tile,
  flagAt: (x: number, y: number) => number,
  random: () => number = Math.random
): Tile | null {
  let misses = 0;
  for (;;) {
    const ix = Math.floor(random() * 3);
    const iy = Math.floor(random() * 3);
    if (ix !== 1 || iy !== 1) {
      const x = caster.x - 1 + ix;
      const y = caster.y - 1 + iy;
      if (allySquareOpen(flagAt(x, y))) return { x, y };
      misses++;
    }
    if (misses > 10) return null;
  }
}

/**
 * The mobile pad has no cursor: Teleport aims the furthest open square straight
 * ahead of the hero, at most `range` tiles along the facing, and gives up when
 * nothing ahead is open. `forward` is the facing as a unit vector.
 */
export function aimAlongFacing(
  from: Tile,
  forward: { x: number; z: number },
  range: number,
  open: (x: number, y: number) => boolean
): Tile | null {
  // The larger axis steps one tile a time so a diagonal reaches the corner of the square range.
  const scale = 1 / Math.max(Math.abs(forward.x), Math.abs(forward.z), 1e-6);
  for (let d = range; d >= 1; d--) {
    const x = from.x + Math.round(forward.x * scale * d);
    const y = from.y + Math.round(forward.z * scale * d);
    if ((x !== from.x || y !== from.y) && open(x, y)) return { x, y };
  }
  return null;
}
