import { describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// The ring the arena has on its way down, and how far it has fallen (cm).
const arena = vi.hoisted(() => ({ drop: 0 }));

vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    OutOfView = false;
    Alpha = 1;
    Type = 13;
    node = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scaling: { x: 1 } };
    async init() {}
    Update() {}
    setAlpha(alpha: number) {
      this.Alpha = alpha;
    }
    dispose() {}
  },
}));
vi.mock('@/controllers/fx/effectParticles', () => ({ ParticleEmitter: class { update() {} } }));
vi.mock('@/ecs/current', () => ({ Ecs: { world: { terrainScale: 100, scene: { getEngine: () => ({ getDeltaTime: () => 16 }) } } } }));
vi.mock('./arena', () => ({
  chaosCastleRingDrop: () => arena.drop,
  chaosCastleRingSmoking: () => false,
  chaosCastleRingVisible: () => true,
  updateChaosCastleArena: () => {},
}));

const { ChaosCastleRingObject } = await import('./ringObject');

const at = (seconds: number) => ({ TotalGameTime: { TotalSeconds: seconds } }) as World['gameTime'];

describe('a Chaos Castle ring (CSChaosCastle.cpp:226-338)', () => {
  // `Update` runs every frame of the fall: the drop rides one offset, never a new object a frame.
  it('falls by the arena\'s drop, in tiles, on one offset it keeps', async () => {
    // The mocked base takes no arguments.
    const ring = new (ChaosCastleRingObject as unknown as new () => InstanceType<typeof ChaosCastleRingObject>)();
    const entity = { transform: { pos: { x: 0, y: 0, z: 0 } } } as unknown as Entity;
    await ring.init({} as World, entity);
    arena.drop = 150;
    ring.Update(at(1));
    const offset = entity.transform?.posOffset;
    expect(offset).toEqual({ x: 0, y: -1.5, z: 0 });
    arena.drop = 300;
    ring.Update(at(1.04));
    expect(entity.transform?.posOffset).toBe(offset);
    expect(offset?.y).toBe(-3);
    arena.drop = 0;
    ring.Update(at(1.08));
    expect(entity.transform?.posOffset).toBeUndefined();
  });
});
