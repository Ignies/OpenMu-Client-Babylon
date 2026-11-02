/**
 * A cheap "is the mouse ray anywhere near this selectable?" before
 * pointerInputSystem.ts pays for its box. `UpdateBoundings` walks the model's child meshes (bones'
 * nodes included) and builds a new list each time; the hover re-samples 20 times a second over every
 * selectable - every monster, player, NPC and each drop on the floor - so a full Lost Tower paid for
 * hundreds of boxes a sample while only the few under the cursor could ever be hit.
 *
 * Each selectable keeps the reach of its last box from where it stands (the farthest padded corner,
 * with slack), refreshed every `REACH_REFRESH_MS` so a new armour, a mount or a transformation is
 * seen within a second. A ray that passes farther than that from its position cannot touch the box.
 */

/** How long a measured reach is trusted, ms. */
export const REACH_REFRESH_MS = 1000;
/** Slack on the measured reach: a swing of the arms or a turn between refreshes. */
export const REACH_SLACK = 1.25;
export const REACH_MARGIN = 0.5;

type V3 = { x: number; y: number; z: number };

/** Squared distance from `p` to the ray (`origin`, `dir`; any length): behind the origin, to the origin. */
export function rayPointDistanceSq(origin: V3, dir: V3, p: V3): number {
  const vx = p.x - origin.x;
  const vy = p.y - origin.y;
  const vz = p.z - origin.z;
  const vv = vx * vx + vy * vy + vz * vz;
  const dd = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
  if (!(dd > 0)) return vv;
  const t = vx * dir.x + vy * dir.y + vz * dir.z;
  if (t <= 0) return vv;
  return Math.max(0, vv - (t * t) / dd);
}

/** The squared reach of the box `min`..`max` from `p`, with the slack. */
export function boxReachSq(p: V3, min: V3, max: V3): number {
  const dx = Math.max(Math.abs(min.x - p.x), Math.abs(max.x - p.x));
  const dy = Math.max(Math.abs(min.y - p.y), Math.abs(max.y - p.y));
  const dz = Math.max(Math.abs(min.z - p.z), Math.abs(max.z - p.z));
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz) * REACH_SLACK + REACH_MARGIN;
  return r * r;
}

export interface Reach {
  r2: number;
  at: number;
}

/** True when the box can be skipped: a reach measured recently that the ray stays outside of. */
export function rayMissesReach(reach: Reach | undefined, now: number, origin: V3, dir: V3, p: V3): boolean {
  if (!reach || now - reach.at >= REACH_REFRESH_MS) return false;
  return rayPointDistanceSq(origin, dir, p) > reach.r2;
}
