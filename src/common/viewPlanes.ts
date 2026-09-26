/**
 * The view volume the map emitters are gated against: `RenderSystem`'s
 * widened frustum, published by it once a frame (its only writer), or null
 * where everything counts as in view.
 */
export type ViewPlane = {
  readonly normal: { readonly x: number; readonly y: number; readonly z: number };
  readonly d: number;
};

let viewScene: object | null = null;
let viewPlanes: readonly ViewPlane[] | null = null;

export function publishViewPlanes(
  scene: object,
  planes: readonly ViewPlane[] | null
): void {
  viewScene = scene;
  viewPlanes = planes;
}

/**
 * Signed distance from the point to the nearest published plane. A sphere is
 * out of view when this is at or below minus its radius, the test
 * `BoundingSphere.isInFrustum` makes. +Infinity without planes for `scene`.
 */
export function viewDepth(scene: object, x: number, y: number, z: number): number {
  const planes = viewPlanes;
  if (!planes || scene !== viewScene) return Infinity;

  let depth = Infinity;

  for (let i = 0; i < planes.length; i++) {
    const { normal, d } = planes[i];
    const dot = normal.x * x + normal.y * y + normal.z * z + d;

    if (dot < depth) depth = dot;
  }

  return depth;
}
