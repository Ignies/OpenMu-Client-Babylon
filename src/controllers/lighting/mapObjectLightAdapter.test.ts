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

/** A placement at (10, 0, 20) tiles, unturned, at `scale`. */
const placed = (scale: number) =>
  ({
    WorldIndex: 33,
    Type: 30,
    node: { position: { x: 10, y: 0, z: 20 }, rotation: { x: 0, y: 0, z: 0 }, scaling: { x: scale } },
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
});
