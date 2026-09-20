/**
 * Ping - the pointer a player drops on the ground with Shift + middle click,
 * and the trail running back to their body, so everyone nearby sees both
 * where they are pointing and who is pointing.
 * See `documentation/ping/ARCHITECTURE.md`.
 *
 * Composed out of two entries rather than owning meshes of its own (the
 * `aura.ts` precedent): a `ring` decal drapes the marker over the terrain,
 * so it follows a slope instead of clipping into it, and a straight `joint`
 * bolt draws the trail with both ends live - the near one follows the owner
 * while they walk, the far one stays on the spot they marked.
 *
 * This entry is also the register of who has a pointer out: one per owner,
 * and a second ping from the same owner replaces the first. That is what the
 * "no new pointer while one is live" rule is checked against, on the sending
 * client before a frame goes out and on every receiver.
 *
 * Driven by: `ping/pingNet.ts`. Read by: `ping/pingNet.ts` (`pingLiveFor`).
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import { PING_LIMITS } from '../common/pingProtocol';
import { LiveList, fixedPoint, type PointSource, type RGB } from './core';
import { RGBS, TEX } from './recipes';
import { spawnJoint } from './joint';
import { spawnRing } from './ring';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Lifetime in seconds - the wire's own number, so every client agrees. */
const SECONDS = PING_LIMITS.lifetimeMs / 1000;

/** Marker diameter in tiles: a bit over a character wide, readable from the default camera. */
const MARKER_TILES = 2.2;

/** The marker snaps in at this much of its size and settles, rather than growing out of nothing. */
const MARKER_GROW_FROM = 1.35;

/** Degrees per second the marker turns, so it reads as live rather than as a stain. */
const MARKER_SPIN = 90;

/**
 * Where on the body the trail is anchored, in tiles above the feet: the
 * chest. Exported because the caller builds the `PointSource`, but the
 * height is this entry's to decide.
 */
export const TRAIL_ANCHOR = 1.1;

/** Trail ribbon width in tiles. */
const TRAIL_WIDTH = 0.16;

/** Points along the trail. Straight, so this is only smoothness over terrain. */
const TRAIL_SEGMENTS = 12;

/** Tiles the trail is lifted over both ends, so it arcs clear of the ground. */
const TRAIL_LIFT = 0.25;

/** Sheet lengths of the joint texture along the ribbon, and how fast they run toward the marker. */
const TRAIL_REPEATS = 3;
const TRAIL_SCROLL = 1.2;

/** One colour for every player: who pinged is already said by where the trail starts. */
const COLOUR: RGB = RGBS.holy;

// ---- 2. state + readers ----------------------------------------------------

export interface PingOptions {
  /** Net id of the player who pinged; the key the one-per-owner rule uses. */
  ownerId: number;
  /** The owner's body, for the near end of the trail. Omitted = marker only. */
  owner?: PointSource;
}

type Live = {
  ownerId: number;
  marker: EffectHandle;
  trail: EffectHandle | null;
};

const live = new LiveList();
const byOwner = new Map<number, Live>();

/** How many pointers are out (debug). */
export function pingCount(): number {
  return byOwner.size;
}

/** Whether this player already has a pointer out - the gate the gesture is refused by. */
export function pingLiveFor(ownerId: number): boolean {
  return byOwner.has(ownerId);
}

function stopFor(ownerId: number): void {
  const previous = byOwner.get(ownerId);
  if (!previous) return;
  previous.marker.stop();
  previous.trail?.stop();
  byOwner.delete(ownerId);
}

function spawn(scene: Scene, at: Vector3, opts: PingOptions): EffectHandle {
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z)) return DEAD_HANDLE;

  // A second ping from the same player replaces the first, wherever it came
  // from: the sender's own gate, the proxy's and this are the same 2 s, so
  // this only ever fires for a client that got past both.
  stopFor(opts.ownerId);

  const marker = spawnRing(scene, at, {
    texture: TEX.magicCircle,
    colour: COLOUR,
    seconds: SECONDS,
    scale: MARKER_TILES,
    growFrom: MARKER_GROW_FROM,
    grow: 1,
    spin: MARKER_SPIN,
  });

  const trail = opts.owner
    ? spawnJoint(scene, at, {
        from: opts.owner,
        to: fixedPoint(at),
        jitter: 0,
        taper: true,
        segments: TRAIL_SEGMENTS,
        width: TRAIL_WIDTH,
        height: TRAIL_LIFT,
        colour: COLOUR,
        seconds: SECONDS,
        texture: TEX.jointSpirit,
        textureRepeats: TRAIL_REPEATS,
        textureScroll: TRAIL_SCROLL,
      })
    : null;

  const entry: Live = { ownerId: opts.ownerId, marker, trail };
  byOwner.set(opts.ownerId, entry);

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      return t < SECONDS;
    },
    release() {
      // Only clear the register if this entry is still the owner's: a
      // replacement already took the slot and must keep it.
      if (byOwner.get(opts.ownerId) === entry) byOwner.delete(opts.ownerId);
      marker.stop();
      trail?.stop();
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  byOwner.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const pingLayer: EffectLayer<PingOptions, 'ping'> = {
  name: 'ping',
  update,
  reset,
  spawn,
};
