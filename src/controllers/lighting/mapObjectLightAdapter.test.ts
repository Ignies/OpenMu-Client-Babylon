import { describe, expect, it, vi } from 'vitest';
import type { World } from '../../ecs/world';
import type { ModelObject } from '../render/modelObject';
import type { LightEmitter } from './mapObjectLights';

// The rows the table answers, and where each flare card was put.
const rows = vi.hoisted(() => ({ current: [] as LightEmitter[] }));
const cards = vi.hoisted(() => [] as { x: number; y: number; z: number }[]);

vi.mock('./mapObjectLights', () => ({
  lightEmittersFor: () => rows.current,
  lightMapObject: () => null,
}));
vi.mock('./effectLights', () => ({
  createEffectLight: async (_scene: unknown, _spec: unknown, position: { x: number; y: number; z: number }) => {
    cards.push(position);
    return null;
  },
}));
vi.mock('../fx/effectParticles', () => ({ ParticleEmitter: class {} }));
vi.mock('../assets', () => ({ reportLoadFailure: () => () => {} }));

const { MapObjectLights } = await import('./mapObjectLightAdapter');

/** A placement at (10, 0, 20) tiles at `scale`, turned by the node angles `rotation`. */
const placed = (scale: number, rotation = { x: 0, y: 0, z: 0 }) =>
  ({
    WorldIndex: 33,
    Type: 30,
    node: { position: { x: 10, y: 0, z: 20 }, rotation, scaling: { x: scale } },
    SelfLight: { set() {}, setAll() {} },
  }) as unknown as ModelObject;

describe('a map object row with an offset', () => {
  // `TransformPosition(BoneTransform[6], ...)`: the bone transforms carry `BodyScale` (ZzzBMD.cpp:168-180).
  it('puts a bone offset where the bone is on a scaled object; a plain offset stays put', () => {
    const card = { scale: 1, color: [1, 1, 1] } as const;
    rows.current = [
      { offset: [32, 2, 54], bone: true, sprite: card },
      { offset: [0, 0, 350], sprite: card },
    ];
    MapObjectLights.attach({ scene: {} } as World, placed(2));
    const [bone, plain] = cards;
    expect([bone.x, bone.y, bone.z]).toEqual([10.64, 1.08, 20.04].map(v => expect.closeTo(v)));
    expect([plain.x, plain.y, plain.z]).toEqual([10, 3.5, 20].map(v => expect.closeTo(v)));
  });

  // `AngleMatrix` (ZzzMathLib.cpp:185-212) turns about x, then y, then z; Babylon's Euler rolls before it pitches.
  it('turns the offset by AngleMatrix on a record with both pitch and roll', () => {
    cards.length = 0;
    rows.current = [{ offset: [30, -20, 50], sprite: { scale: 1, color: [1, 1, 1] } }];
    const [a0, a1, a2] = [20, 30, -130].map(a => (a * Math.PI) / 180);
    // createObjects then toRenderAngles: (-a0, 2pi - a2, -a1).
    MapObjectLights.attach({ scene: {} } as World, placed(1, { x: -a0, y: Math.PI * 2 - a2, z: -a1 }));
    const [sr, cr, sp, cp, sy, cy] = [Math.sin(a0), Math.cos(a0), Math.sin(a1), Math.cos(a1), Math.sin(a2), Math.cos(a2)];
    const m = [
      [cp * cy, sr * sp * cy - cr * sy, cr * sp * cy + sr * sy],
      [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy - sr * cy],
      [-sp, sr * cp, cr * cp],
    ];
    const [x, y, z] = m.map(row => (row[0] * 30 + row[1] * -20 + row[2] * 50) / 100);
    const [card] = cards;
    expect([card.x, card.y, card.z]).toEqual([10 + x, z, 20 + y].map(v => expect.closeTo(v, 5)));
  });
});
