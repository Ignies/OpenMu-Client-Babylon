import { describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// `create.ts` reaches the event modules, which read the page's address.
vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Every flare the beacons asked for, and what each last did.
type Asked = { scale: number; color: readonly number[]; texture?: string; at?: number[]; angle?: number };
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo: (x: number, y: number, z: number) => void (asked.at = [x, y, z]),
      setAngle: (degrees: number) => void (asked.angle = degrees),
      dispose() {},
    };
  },
}));
// A beacon placed at (10, 2, 20) tiles.
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    static Batchable = true;
    Ready = true;
    OutOfView = false;
    node = { position: { x: 10, y: 2, z: 20 } };
    async init() {}
    Update() {}
    dispose() {}
  },
}));

const { CrywolfBeaconObject } = await import('./beaconObject');
const { createCrywolf } = await import('./create');

type Beacon = InstanceType<typeof CrywolfBeaconObject>;

/** `n` beacons, lit, and their flares in the order they asked for them. */
async function light(n: number): Promise<{ beacons: Beacon[]; cards: Asked[] }> {
  const first = flares.length;
  const beacons: Beacon[] = [];
  for (let i = 0; i < n; i++) {
    // The mocked base takes no arguments.
    const beacon = new (CrywolfBeaconObject as unknown as new () => Beacon)();
    await beacon.init({ scene: {} } as World, {} as Entity);
    beacons.push(beacon);
  }
  return { beacons, cards: flares.slice(first) };
}

/** One frame at `ms`: every beacon updates, in view or not. */
const frame = (beacons: Beacon[], ms: number) => {
  for (const beacon of beacons) beacon.Update({ TotalGameTime: { TotalSeconds: ms / 1000 } } as World['gameTime']);
};

/** Degrees turned from `from` to `to`, counter-clockwise. */
const turned = (from = 0, to = 0) => (((to - from) % 360) + 360) % 360;

describe('the Crywolf beacon (41)', () => {
  it('is type 41\'s class and never a batched prop: each turns the shared angle while it is drawn', async () => {
    const tiles: unknown[] = [];
    await createCrywolf({ terrain: { MapTileObjects: tiles } } as unknown as World);
    expect(tiles[41]).toBe(CrywolfBeaconObject);
    expect(CrywolfBeaconObject.Batchable).toBe(false);
  });

  // `CreateSprite(BITMAP_FLARE, p, 1.3f, (1, 1, 1), o)` twice, `p[2] += 350 + aaa`, `aaa` Time_Effect's ride.
  it('draws two white BITMAP_FLARE 1.3 across, 350 up and riding 0-20-0 (GMCrywolf1st.cpp:395-416)', async () => {
    const { beacons, cards } = await light(1);
    expect(cards.map(c => [c.scale, c.color, c.texture])).toEqual([
      [1.3, [1, 1, 1], 'flare'],
      [1.3, [1, 1, 1], 'flare'],
    ]);
    frame(beacons, 410);
    expect(cards.map(c => c.at)).toEqual([[10, 5.6, 20], [10, 5.6, 20]].map(p => p.map(v => expect.closeTo(v))));
    frame(beacons, 820);
    expect(cards[0].at?.[1]).toBeCloseTo(5.7);
    expect(cards[0].angle).toBeUndefined();
  });

  // `static float Ro; Ro += 1.0f;` in every beacon's draw, a frame at 25 a second: n in view turn it n times as fast.
  it('turns its second flare by the one angle every beacon in view bumps a degree a frame', async () => {
    const { beacons, cards } = await light(3);
    const last = () => cards[5].angle;
    frame(beacons, 1000);
    const start = last();
    frame(beacons, 1040);
    expect(turned(start, last())).toBeCloseTo(3);
    beacons[1].OutOfView = true;
    const hidden = cards[3].angle;
    frame(beacons, 1080);
    expect(turned(start, last())).toBeCloseTo(5);
    expect(cards[3].angle).toBe(hidden);
  });
});
