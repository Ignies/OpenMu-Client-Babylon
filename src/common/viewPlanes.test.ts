import { afterEach, describe, expect, it } from 'vitest';
import { publishViewPlanes, viewDepth, type ViewPlane } from './viewPlanes';

/** Inward-facing planes of the box |x|, |y|, |z| <= half. */
function box(half: number): ViewPlane[] {
  return [
    { normal: { x: 1, y: 0, z: 0 }, d: half },
    { normal: { x: -1, y: 0, z: 0 }, d: half },
    { normal: { x: 0, y: 1, z: 0 }, d: half },
    { normal: { x: 0, y: -1, z: 0 }, d: half },
    { normal: { x: 0, y: 0, z: 1 }, d: half },
    { normal: { x: 0, y: 0, z: -1 }, d: half },
  ];
}

describe('viewDepth', () => {
  const scene = {};

  afterEach(() => publishViewPlanes(scene, null));

  it('is unbounded without planes', () => {
    publishViewPlanes(scene, null);

    expect(viewDepth(scene, 1e6, 0, 0)).toBe(Infinity);
  });

  it('is unbounded for a scene the planes were not published for', () => {
    publishViewPlanes(scene, box(10));

    expect(viewDepth({}, 1e6, 0, 0)).toBe(Infinity);
  });

  it('is the distance to the nearest plane, negative outside', () => {
    publishViewPlanes(scene, box(10));

    expect(viewDepth(scene, 0, 0, 0)).toBe(10);
    expect(viewDepth(scene, 7, -2, 1)).toBe(3);
    expect(viewDepth(scene, 0, 0, -14)).toBe(-4);
  });

  it('matches BoundingSphere.isInFrustum at the boundary', () => {
    publishViewPlanes(scene, box(10));

    // isInFrustum: out when dotCoordinate(center) <= -radius.
    const radius = 4;

    expect(viewDepth(scene, 14, 0, 0) <= -radius).toBe(true);
    expect(viewDepth(scene, 13.99, 0, 0) <= -radius).toBe(false);
  });
});
