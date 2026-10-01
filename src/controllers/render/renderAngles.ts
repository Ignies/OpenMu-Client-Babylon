import type { IVector3Like, Vector3 } from './babylon/exports';

/**
 * Entity `transform.rot` -> Babylon node Euler angles: `AngleMatrix(a0,a1,a2)`
 * maps to `(-a0, -a2, -a1)`. Yaw is flipped here and nowhere else.
 */
export function toRenderAngles(rot: IVector3Like, out: Vector3): Vector3 {
  out.x = rot.x;
  out.y = Math.PI * 2 - rot.y;
  out.z = rot.z;
  return out;
}
