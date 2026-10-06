import { Matrix, Quaternion, type IVector3Like, type Vector3 } from './babylon/exports';

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

/** Made on first use: modules that mock the Babylon exports load this one too. */
let angleMatrix: Matrix | undefined;

/**
 * `AngleMatrix(a0, a1, a2)` (ZzzMathLib.cpp:185-212, here in radians) as a rotation: Z·Y·X, so MU
 * turns about its x before its y, where a node's Euler turns about our z (MU's y) before our x. The
 * conversion puts MU (x, y, z) on (x, z, y), so this is P·R·P⁻¹ with P swapping y and z, written
 * transposed for Babylon's row vectors.
 */
export function angleMatrixQuaternion(a0: number, a1: number, a2: number, out: Quaternion): Quaternion {
  const sr = Math.sin(a0);
  const cr = Math.cos(a0);
  const sp = Math.sin(a1);
  const cp = Math.cos(a1);
  const sy = Math.sin(a2);
  const cy = Math.cos(a2);
  const m00 = cp * cy;
  const m10 = cp * sy;
  const m20 = -sp;
  const m01 = sr * sp * cy - cr * sy;
  const m11 = sr * sp * sy + cr * cy;
  const m21 = sr * cp;
  const m02 = cr * sp * cy + sr * sy;
  const m12 = cr * sp * sy - sr * cy;
  const m22 = cr * cp;
  Matrix.FromValuesToRef(m00, m20, m10, 0, m02, m22, m12, 0, m01, m21, m11, 0, 0, 0, 0, 1, (angleMatrix ??= new Matrix()));
  return Quaternion.FromRotationMatrixToRef(angleMatrix, out);
}

/** The rotation render angles stand for: the original's `AngleMatrix` of the MU `Angle` they map. */
export function renderAnglesQuaternion(angles: IVector3Like, out: Quaternion): Quaternion {
  return angleMatrixQuaternion(-angles.x, -angles.z, -angles.y, out);
}
