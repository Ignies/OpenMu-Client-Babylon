import type { IVector3Like, Vector3 } from '../libs/babylon/exports';

/**
 * Entity `transform.rot` → Babylon node Euler angles.
 *
 * The BMD→Babylon conversion on every model root (`scaling (1,-1,1)` +
 * `rotX(-90°)`, modelObject.ts) is a mirror, so the original's
 * `AngleMatrix(a0,a1,a2)` (Rz·Ry·Rx, Z-up) maps to Babylon as
 * `(x, y, z) = (-a0, -a2, -a1)`. The loader already negates pitch/roll; yaw is
 * kept "MU-positive" in `transform.rot.y` because the character code computes
 * it with `atan2` in that convention, and is flipped here — in exactly one
 * place, so `init()`-time readers of `node.rotation` (particle emitters, map
 * object lights) see the same value the render loop will use.
 *
 * Known approximation: Babylon evaluates `node.rotation` as Z→X→Y while the
 * original applies X→Z→Y after the remap; the two differ only when an object
 * has both a pitch *and* a roll (rare in the map data).
 */
export function toRenderAngles(rot: IVector3Like, out: Vector3): Vector3 {
  out.x = rot.x;
  out.y = Math.PI * 2 - rot.y;
  out.z = rot.z;
  return out;
}
