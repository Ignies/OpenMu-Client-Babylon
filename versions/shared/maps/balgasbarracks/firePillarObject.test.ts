import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// What the pillar spawned, frame by frame, and whether it stands in view.
const made = vi.hoisted(() => ({ spawns: [] as unknown[][], depth: 10 }));

vi.mock('@/controllers/fx/effectParticles', () => ({
  KIND_REACH: { fireRed: { travel: 6.2, base: 0, perScale: 0.58 } },
  spawnParticle: async (...args: unknown[]) => {
    made.spawns.push(args);
  },
}));
vi.mock('@/controllers/render/viewPlanes', () => ({ viewDepth: () => made.depth }));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    node = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, scaling: { x: 1.04 } };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { BalgasFirePillarObject } = await import('./firePillarObject');

const scene = { getEngine: () => ({ getDeltaTime: () => 40 }) };

/** The particles a placed pillar makes on each of `frames` 25 Hz frames from `startMs` of WorldTime. */
async function play(startMs: number, frames: number): Promise<number[]> {
  // The mocked base takes no arguments.
  const pillar = new (BalgasFirePillarObject as unknown as new () => InstanceType<typeof BalgasFirePillarObject>)();
  await pillar.init({ scene } as unknown as World, {} as Entity);

  const counts: number[] = [];
  for (let k = 0; k < frames; k++) {
    const before = made.spawns.length;
    pillar.Update({ TotalGameTime: { TotalSeconds: (startMs + 40 * k) / 1000 } } as World['gameTime']);
    counts.push(made.spawns.length - before);
  }
  return counts;
}

beforeEach(() => {
  made.spawns.length = 0;
  made.depth = 10;
});

describe('the Refuge fire pillar, 92 (GM3rdChangeUp.cpp:239-252)', () => {
  // While `(sinf(WorldTime * 0.0005f) + 1) * 0.5f > 0.9f` two BITMAP_FIRE_RED effects a tick; each makes one
  // BITMAP_FIRE_RED particle a tick from the next tick on, for its 40 (EffectBehaviors.cpp:122-131, ZzzEffect.cpp:8573).
  it('makes two effects a tick on the crest of its wave, each making a particle a tick for 40 ticks', async () => {
    const counts = await play(2000, 46);
    expect(counts.slice(0, 4)).toEqual([0, 2, 4, 6]);
    expect(counts[40]).toBe(80);
    expect(counts[45]).toBe(80);
  });

  // `pObject->Scale` lands in CreateEffect's `Skill`, so the effect keeps the 0.9 of a scale of 0 (ZzzEffect.cpp:365-368).
  it("makes BITMAP_FIRE_RED in (1, 0.4, 0.4) at the effect's 0.9, whatever the pillar's scale", async () => {
    await play(2000, 2);
    expect(made.spawns[0].slice(1)).toEqual(['fireRed', { x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 0 }, 0.9, [1, 0.4, 0.4]]);
  });

  it('stops making effects past the crest, and the made ones run out over 40 ticks', async () => {
    // The crest ends at WorldTime 4428.6: the frames from 3000 make effects up to the 36th.
    const counts = await play(3000, 80);
    expect([counts[36], counts[40], counts[41], counts[75], counts[76]]).toEqual([72, 72, 70, 2, 0]);
  });

  it('makes no effects out of view, as RenderObjectVisual runs only in view', async () => {
    made.depth = -100;
    expect((await play(2000, 50)).every(n => n === 0)).toBe(true);
  });
});
