import { Matrix, Vector3, type IVector3Like } from '../render/babylon/exports';

/**
 * "Rest against any wall" (the `restAnyWall` improvement): which map objects
 * are straight walls, where a click on one hits it, and the tile and facing
 * the hero leans from. Pure geometry; the caller hands in the boxes and the
 * walkability.
 */

/** A type's box under its node: Y up, model units (tiles at scale 1). */
export interface LocalBox {
  readonly min: IVector3Like;
  readonly max: IVector3Like;
}

/** Where the hero leans: the tile to walk to and the yaw (`transform.rot.y`) to face. */
export interface WallStand {
  x: number;
  y: number;
  rotY: number;
}

/** Thresholds in tiles: standing on the ground, at least waist high and a tile long, 2.5 times longer than thick. */
const MAX_BASE = 0.3;
const MIN_HEIGHT = 0.9;
const MIN_LENGTH = 0.9;
const MAX_THICKNESS = 2.5;
const MIN_RATIO = 2.5;

/** Tiles beside the wall's face the hero may stand at, nearest first. */
const STAND_OFFSETS = [0.5, 1, 1.5];

/** Tiles across the wall's centre line, one of which must be a wall on the terrain. */
const BLOCK_OFFSETS = [0, -0.3, 0.3];

export function isRestWall(box: LocalBox, scale: number): boolean {
  const { min, max } = box;
  const dx = max.x - min.x;
  const dz = max.z - min.z;
  const length = Math.max(dx, dz);
  const thickness = Math.min(dx, dz);

  return (
    min.y * scale <= MAX_BASE &&
    (max.y - Math.max(min.y, 0)) * scale >= MIN_HEIGHT &&
    length * scale >= MIN_LENGTH &&
    thickness * scale <= MAX_THICKNESS &&
    length >= MIN_RATIO * thickness
  );
}

const inv = new Matrix();
const o = new Vector3();
const d = new Vector3();
const p = new Vector3();
const n = new Vector3();

/**
 * The ray parameter where `origin + t * dir` enters the box under `placement`
 * (the part above the object's ground), the local entry point into `hitLocal`;
 * -1 on a miss.
 */
export function hitWall(
  box: LocalBox,
  placement: Matrix,
  origin: IVector3Like,
  dir: IVector3Like,
  hitLocal: Vector3
): number {
  placement.invertToRef(inv);
  Vector3.TransformCoordinatesFromFloatsToRef(origin.x, origin.y, origin.z, inv, o);
  Vector3.TransformNormalFromFloatsToRef(dir.x, dir.y, dir.z, inv, d);

  let near = 0;
  let far = Number.POSITIVE_INFINITY;
  for (let axis = 0; axis < 3; axis++) {
    const lo = axis === 0 ? box.min.x : axis === 1 ? Math.max(box.min.y, 0) : box.min.z;
    const hi = axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z;
    const s = axis === 0 ? o.x : axis === 1 ? o.y : o.z;
    const v = axis === 0 ? d.x : axis === 1 ? d.y : d.z;
    if (Math.abs(v) < 1e-9) {
      if (s < lo || s > hi) return -1;
      continue;
    }
    let t0 = (lo - s) / v;
    let t1 = (hi - s) / v;
    if (t0 > t1) {
      const swap = t0;
      t0 = t1;
      t1 = swap;
    }
    if (t0 > near) near = t0;
    if (t1 < far) far = t1;
    if (near > far) return -1;
  }

  hitLocal.set(o.x + d.x * near, o.y + d.y * near, o.z + d.z * near);
  return near;
}

/** The tile under a local point at the box's ground, as `isWalkable` reads it. */
function tileAt(placement: Matrix, along: number, perp: number, alongX: boolean): void {
  Vector3.TransformCoordinatesFromFloatsToRef(alongX ? along : perp, 0, alongX ? perp : along, placement, p);
}

/**
 * The tile beside the wall nearest the clicked point, on the hero's side when
 * it is free (else the other), and the yaw facing away from the wall. False
 * when the wall stands on walkable ground (a bridge, a sign in the open) or
 * no tile beside it is free.
 */
export function wallStand(
  box: LocalBox,
  placement: Matrix,
  hitLocal: IVector3Like,
  heroX: number,
  heroZ: number,
  isWalkable: (x: number, y: number) => boolean,
  out: WallStand
): boolean {
  const m = placement.m;
  const scale = Math.hypot(m[0], m[1], m[2]) || 1;
  const alongX = box.max.x - box.min.x >= box.max.z - box.min.z;
  const aMin = alongX ? box.min.x : box.min.z;
  const aMax = alongX ? box.max.x : box.max.z;
  const pMin = alongX ? box.min.z : box.min.x;
  const pMax = alongX ? box.max.z : box.max.x;
  const along = Math.min(aMax, Math.max(aMin, alongX ? hitLocal.x : hitLocal.z));
  const centre = (pMin + pMax) / 2;

  let blocked = false;
  for (const off of BLOCK_OFFSETS) {
    tileAt(placement, along, centre + off / scale, alongX);
    if (!isWalkable(Math.floor(p.x), Math.floor(p.z))) blocked = true;
  }
  if (!blocked) return false;

  placement.invertToRef(inv);
  Vector3.TransformCoordinatesFromFloatsToRef(heroX, m[13], heroZ, inv, o);
  const heroSide = (alongX ? o.z : o.x) >= centre ? 1 : -1;

  for (let flip = 0; flip < 2; flip++) {
    const side = flip === 0 ? heroSide : -heroSide;
    for (const off of STAND_OFFSETS) {
      tileAt(placement, along, side > 0 ? pMax + off / scale : pMin - off / scale, alongX);
      const x = Math.floor(p.x);
      const y = Math.floor(p.z);
      if (!isWalkable(x, y)) continue;

      Vector3.TransformNormalFromFloatsToRef(alongX ? 0 : side, 0, alongX ? side : 0, placement, n);
      out.x = x;
      out.y = y;
      // `transform.rot.y` faces (dx, dz) at atan2(dz, dx) + pi/2 (moveAlongPathSystem).
      out.rotY = Math.atan2(n.z, n.x) + Math.PI / 2;
      return true;
    }
  }
  return false;
}
