import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Quaternion, Vector3 } from './babylon/exports';
import { ModelObject } from './modelObject';
import { placementMatrix } from './propBatchRules';
import { angleMatrixQuaternion, toRenderAngles } from './renderAngles';

type Angle = readonly [number, number, number];

/** `AngleMatrix` (ZzzMathLib.cpp:185-212) as written: degrees, `matrix = (Z * Y) * X`. */
function angleMatrix(a: Angle): number[][] {
  const d = (Math.PI * 2) / 360;
  const [sy, cy] = [Math.sin(a[2] * d), Math.cos(a[2] * d)];
  const [sp, cp] = [Math.sin(a[1] * d), Math.cos(a[1] * d)];
  const [sr, cr] = [Math.sin(a[0] * d), Math.cos(a[0] * d)];
  return [
    [cp * cy, sr * sp * cy + cr * -sy, cr * sp * cy + -sr * -sy],
    [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy + -sr * cy],
    [-sp, sr * cp, cr * cp],
  ];
}

/** MU's (x, y, z) is our (x, z, y). */
const ours = ([x, y, z]: readonly number[]) => new Vector3(x, z, y);

/** Where the original turns an object-space offset, in our axes. */
const turned = (a: Angle, v: readonly number[]) => ours(angleMatrix(a).map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));

/** A record's `Angle` as `createObjects` and `toRenderAngles` hand it to the node. */
const nodeAngles = (a: Angle) => {
  const d = Math.PI / 180;
  return toRenderAngles({ x: -a[0] * d, y: a[2] * d, z: -a[1] * d }, new Vector3());
};

const OFFSETS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [30, -20, 50],
];

// Placed records with both Angle[0] and Angle[1] set (4795 over every world): Devias 111, Crywolf 15,
// the Fortress' 95; and one tilt alone, which Babylon's Euler already turned right.
const TILTED: Angle[] = [
  [20, 30, -130],
  [-13, 11, 81],
  [720, 720, 1200],
];
const SINGLE: Angle[] = [
  [25, 0, 60],
  [0, -40, 200],
];

const expectAt = (got: Vector3, want: Vector3) =>
  expect([got.x, got.y, got.z]).toEqual([want.x, want.y, want.z].map(v => expect.closeTo(v, 4)));

describe('a placed object turned by pitch and roll', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  afterAll(() => engine.dispose());

  // Babylon's Euler rolls (about our z, MU's y) before it pitches; `AngleMatrix` turns about MU's x first.
  it('angleMatrixQuaternion turns as AngleMatrix does', () => {
    const d = Math.PI / 180;
    const q = new Quaternion();
    for (const a of [...TILTED, ...SINGLE]) {
      angleMatrixQuaternion(a[0] * d, a[1] * d, a[2] * d, q);
      for (const v of OFFSETS) expectAt(ours(v).applyRotationQuaternion(q), turned(a, v));
    }
  });

  it('is drawn where the original draws it, by its node', () => {
    for (const a of [...TILTED, ...SINGLE]) {
      const object = new ModelObject(scene);
      object.IsMapObject = true;
      object.updateLocation({ x: 0, y: 0, z: 0 }, 1, nodeAngles(a));
      const world = object.node.computeWorldMatrix(true);
      for (const v of OFFSETS) expectAt(Vector3.TransformCoordinates(ours(v), world), turned(a, v));
      object.dispose();
    }
  });

  it('and by its batched placement', () => {
    const d = Math.PI / 180;
    for (const a of [...TILTED, ...SINGLE]) {
      const m = placementMatrix({ pos: { x: 0, y: 0, z: 0 }, rot: { x: -a[0] * d, y: a[2] * d, z: -a[1] * d }, scale: 1 }, new Matrix());
      for (const v of OFFSETS) expectAt(Vector3.TransformCoordinates(ours(v), m), turned(a, v));
    }
  });
});
