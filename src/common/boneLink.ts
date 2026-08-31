import { Matrix } from '../libs/babylon/exports';

/**
 * The 3×4 matrix maths `RenderLinkObject` builds a bone-link transform with
 * (ZzzMathLib.cpp:194 `AngleMatrix`, :254 `R_ConcatTransforms`), shared by
 * every part that hangs off a bone with an explicit matrix — back weapons
 * (weaponAttachment.ts) and capes (wings.ts).
 *
 * Angles are degrees in BMD space, offsets are centimetres.
 */

const DEG = Math.PI / 180;
const CM = 1 / 100;

export type BmdLink = {
  angle: [number, number, number];
  offset: [number, number, number];
};

/** MU's `float[3][4]`: rows, column-vector convention, translation in column 3. */
export type Mat34 = [number[], number[], number[]];

/** AngleMatrix (ZzzMathLib.cpp:194): `(Z * Y) * X`, angles[0] about X. */
export function angleMatrix(link: BmdLink): Mat34 {
  const [ax, ay, az] = link.angle;
  const sy = Math.sin(az * DEG);
  const cy = Math.cos(az * DEG);
  const sp = Math.sin(ay * DEG);
  const cp = Math.cos(ay * DEG);
  const sr = Math.sin(ax * DEG);
  const cr = Math.cos(ax * DEG);
  const [tx, ty, tz] = link.offset;
  return [
    [cp * cy, sr * sp * cy + cr * -sy, cr * sp * cy + -sr * -sy, tx],
    [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy + -sr * cy, ty],
    [-sp, sr * cp, cr * cp, tz],
  ];
}

/**
 * R_ConcatTransforms (ZzzMathLib.cpp:254) in its exact evaluation order.
 * Passing the same array as `in1` and `out` reproduces the original's
 * aliasing, which is deliberate — see weaponAttachment.ts.
 */
export function concatTransforms(in1: Mat34, in2: Mat34, out: Mat34) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      let v =
        in1[r][0] * in2[0][c] + in1[r][1] * in2[1][c] + in1[r][2] * in2[2][c];
      if (c === 3) v += in1[r][3];
      out[r][c] = v;
    }
  }
}

/** MU column-vector 3x4 (cm) → Babylon row-major matrix (metres). */
export function toBabylon(m: Mat34): Matrix {
  return Matrix.FromValues(
    m[0][0], m[1][0], m[2][0], 0,
    m[0][1], m[1][1], m[2][1], 0,
    m[0][2], m[1][2], m[2][2], 0,
    m[0][3] * CM, m[1][3] * CM, m[2][3] * CM, 1
  );
}

/** The common case: one `AngleMatrix` straight to a Babylon link matrix. */
export function angleLinkMatrix(link: BmdLink): Matrix {
  return toBabylon(angleMatrix(link));
}
