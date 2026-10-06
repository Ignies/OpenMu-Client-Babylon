import { describe, expect, it, vi } from 'vitest';
import type { World } from '@/ecs/world';

// Every flare the object asked for, where it was put, how bright and how turned it was last.
type Asked = {
  scale: number;
  color: readonly number[];
  texture?: string;
  at?: number[];
  lumi?: number;
  angle?: number;
};
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo: (x: number, y: number, z: number) => void (asked.at = [x, y, z]),
      setLuminosity: (lumi: number) => void (asked.lumi = lumi),
      setScale() {},
      setAngle: (degrees: number) => void (asked.angle = degrees),
      dispose() {},
    };
  },
}));
// A record at (10, 2, 30) tiles, scaled 1.3: no body, no model asked for.
vi.mock('@/controllers/render/modelObject', () => ({
  ModelObject: class {
    Ready = false;
    Visible = true;
    CastsShadow = true;
    node = { scaling: { x: 1.3 }, position: { x: 10, y: 2, z: 30 } };
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { LostTowerLightningObject } = await import('./lightningObject');

/** The object inited and run a frame at `seconds`, then again once its flares arrived. */
async function run(seconds: number) {
  flares.length = 0;
  // The mocked base takes no arguments.
  const object = new (LostTowerLightningObject as unknown as new () => InstanceType<typeof LostTowerLightningObject>)();
  await object.init({ scene: {} } as World);
  const at = { TotalGameTime: { TotalSeconds: seconds } } as World['gameTime'];
  object.Update(at);
  await new Promise(resolve => setTimeout(resolve, 0));
  object.Update(at);
  return { object, drawn: flares };
}

describe('Lost Tower 40, placed with no model', () => {
  it('draws nothing of its own and is ready at once', async () => {
    const { object } = await run(0);
    expect([object.Ready, object.Visible, object.CastsShadow]).toEqual([true, false, false]);
  });

  // `CreateSprite(BITMAP_LIGHTNING + 1, o->Position + (0, 0, 260), 2.5f, (L, L, L), o, +-Rotation)`, no
  // `* o->Scale` (ZzzObject.cpp:2913-2920).
  it('draws two white BITMAP_LIGHTNING + 1 260 up, turning against each other', async () => {
    const { drawn } = await run(1.234);
    expect(drawn.map(f => [f.texture, f.scale, f.color.join()])).toEqual([
      ['lightning1', 2.5, '1,1,1'],
      ['lightning1', 2.5, '1,1,1'],
    ]);
    expect(drawn.map(f => f.at)).toEqual([
      [10, 4.6, 30],
      [10, 4.6, 30],
    ]);
    // `Rotation = (float)((int)(WorldTime * 0.1f) % 360)`.
    expect(drawn.map(f => f.angle)).toEqual([123, -123]);
  });

  // `Luminosity = (float)(rand() % 30 + 70) * 0.01f`, one roll a frame for both (ZzzObject.cpp:2737).
  it('rolls one luminosity a frame for both, 0.70 to 0.99', async () => {
    const { drawn } = await run(7.2);
    const [a, b] = drawn.map(f => f.lumi ?? NaN);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0.7);
    expect(a).toBeLessThanOrEqual(0.99 + 1e-9);
    expect(Math.round(a * 100) / 100).toBeCloseTo(a, 9);
  });
});
