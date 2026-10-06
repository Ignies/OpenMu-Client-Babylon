import { describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// Every flare a machine asked for, and the angle it was last turned to.
type Asked = { scale: number; color: readonly number[]; texture?: string; angle?: number };
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo() {},
      setLuminosity() {},
      setAngle: (degrees: number) => void (asked.angle = degrees),
      dispose() {},
    };
  },
}));
// The rig's bones 15, 19 and 21, each posed away from the origin.
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    OutOfView = false;
    Type = 19;
    node = { scaling: { x: 1.3 }, getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
    gltf = {
      mesh: { getDescendants: () => [] },
      skeleton: {
        bones: [15, 19, 21].map(i => ({
          getTransformNode: () => ({ name: `bone_${i}_`, getAbsolutePosition: () => ({ x: i, y: 1, z: 0 }) }),
        })),
      },
    };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/ecs/current', () => ({ Ecs: { world: { scene: {} } } }));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { LostTowerMachineObject } = await import('./towerMachineObject');

/** A machine of `type` lit and run to `seconds`. */
async function lit(type: number, seconds: number) {
  flares.length = 0;
  // The mocked base takes no arguments.
  const machine = new (LostTowerMachineObject as unknown as new () => InstanceType<typeof LostTowerMachineObject>)();
  machine.Type = type;
  await machine.init({} as World, {} as Entity);
  const at = { TotalGameTime: { TotalSeconds: seconds } } as World['gameTime'];
  machine.Update(at);
  await new Promise(resolve => setTimeout(resolve, 0));
  machine.Update(at);
  return { machine, at };
}

async function run(type: number, seconds: number): Promise<Asked[]> {
  await lit(type, seconds);
  return flares;
}

describe('the Lost Tower machines (types 19 and 20)', () => {
  // Bones 15, 19 at 0.3 and 21 at 1.5, each a pair at +Rotation and -Rotation, no `* o->Scale` (ZzzObject.cpp:2890-2912).
  it('19 draws BITMAP_MAGIC + 1 pairs turning against each other', async () => {
    const drawn = await run(19, 1.234);
    expect(drawn.map(f => f.texture)).toEqual(Array(6).fill('magic1'));
    expect(drawn.map(f => f.scale)).toEqual([0.3, 0.3, 0.3, 0.3, 1.5, 1.5]);
    expect(drawn.every(f => f.color.join() === '1,0.2,0')).toBe(true);
    // `Rotation = (float)((int)(WorldTime * 0.1f) % 360)`.
    expect(drawn.map(f => f.angle)).toEqual([123, -123, 123, -123, 123, -123]);
  });

  it('20 draws BITMAP_LIGHTNING + 1 in blue', async () => {
    const drawn = await run(20, 4);
    expect(drawn.map(f => f.texture)).toEqual(Array(6).fill('lightning1'));
    expect(drawn.every(f => f.color.join() === '0.4,0.8,1')).toBe(true);
    expect(drawn.map(f => f.angle)).toEqual([40, -40, 40, -40, 40, -40]);
  });

  // `Update` runs every frame: the pairs turn in a plain loop, not a `forEach` callback made each frame.
  it('turns its pairs every frame without making a callback', async () => {
    const { machine, at } = await lit(19, 2);
    const each = vi.spyOn(Array.prototype, 'forEach');
    machine.Update(at);
    const calls = each.mock.calls.length;
    each.mockRestore();
    expect(calls).toBe(0);
    expect(flares.map(f => f.angle)).toEqual([200, -200, 200, -200, 200, -200]);
  });
});
