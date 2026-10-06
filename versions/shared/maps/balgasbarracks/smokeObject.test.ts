import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// What the vent spawned (kind and scale), and whether it stands in view.
const made = vi.hoisted(() => ({ spawns: [] as [string, number][], depth: 10 }));

vi.mock('@/controllers/fx/effectParticles', () => ({
  KIND_REACH: new Proxy({}, { get: () => ({ travel: 5, base: 3, perScale: 1 }) }),
  spawnParticle: async (_scene: unknown, kind: string, _at: unknown, _turn: unknown, scale: number) => {
    made.spawns.push([kind, scale]);
  },
}));
vi.mock('@/controllers/render/viewPlanes', () => ({ viewDepth: () => made.depth }));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    Type = 0;
    node = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, scaling: { x: 1.5 } };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { BalgasSmokeObject } = await import('./smokeObject');

const scene = { getEngine: () => ({ getDeltaTime: () => 40 }) };
const TIME = { TotalGameTime: { TotalSeconds: 0 } } as World['gameTime'];

/** What a placed `type` makes on each of `ticks` 25 Hz frames, as `kind@scale` lists. */
async function play(type: number, ticks: number): Promise<string[][]> {
  // The mocked base takes no arguments.
  const vent = new (BalgasSmokeObject as unknown as new () => InstanceType<typeof BalgasSmokeObject>)();
  vent.Type = type;
  await vent.init({ scene } as unknown as World, {} as Entity);

  const out: string[][] = [];
  for (let t = 0; t < ticks; t++) {
    const before = made.spawns.length;
    vent.Update(TIME);
    out.push(made.spawns.slice(before).map(([kind, scale]) => `${kind}@${scale}`));
  }
  return out;
}

beforeEach(() => {
  made.spawns.length = 0;
  made.depth = 10;
});

const TICKS = 200_000;

/** Every distinct tick's spawns, sorted. */
const shapes = (ticks: string[][]) => [...new Set(ticks.map(s => s.join(' ')))].sort();

/** How each tick's spawns split into the pairs `first` / `second` name, by their leading kind. */
function pairs(ticks: string[][], first: (s: string[]) => boolean, second: (s: string[]) => boolean) {
  const seq: string[] = [];
  let both = 0;
  for (const s of ticks) {
    const a = first(s);
    const b = second(s);
    if (a && b) both++;
    if (a) seq.push('a');
    if (b) seq.push('b');
  }
  const runs = new Set<string>();
  for (let i = 1; i < seq.length; i++) runs.add(seq[i - 1] + seq[i]);
  return { both, a: seq.filter(x => x === 'a').length / ticks.length, b: seq.filter(x => x === 'b').length / ticks.length, runs };
}

describe('Balgass 5 (GM3rdChangeUp.cpp:133-153)', () => {
  // Two `rand_fps_check(2)` a tick each step `o->Timer` when they pass; the first makes its pair when its step lands on
  // 2 (mod 4), the second when its step lands on 0: never both on one tick, one tick in eight each, in a random order.
  it('makes its two pairs on their own ticks, one tick in eight each, in an order the dice pick', async () => {
    const ticks = await play(5, TICKS);
    expect(shapes(ticks)).toEqual(['', 'cloud6@1.5 fi01_1@1.5', 'fi02_0@1.5 fi01_0@1.5']);
    const p = pairs(ticks, s => s[0] === 'fi02_0@1.5', s => s[0] === 'cloud6@1.5');
    expect(p.both).toBe(0);
    expect(p.a).toBeCloseTo(1 / 8, 2);
    expect(p.b).toBeCloseTo(1 / 8, 2);
    expect([...p.runs].sort()).toEqual(['aa', 'ab', 'ba', 'bb']);
  });
});

describe('Balgass 85 (GM3rdChangeUp.cpp:187-210)', () => {
  // The first pair's BITMAP_ADV_SMOKE + 1 SubType 1 waits on one more `rand_fps_check(2)`; the second pair's
  // ADV_SMOKE SubType 2 is at twice the scale.
  it('walks the same timer, its first pair behind one more coin, its second at twice the scale', async () => {
    const ticks = await play(85, TICKS);
    expect(shapes(ticks)).toEqual(['', 'cloud14@1.5 fi01_2@3', 'fi01_2@1.5', 'fi02_1@1.5 fi01_2@1.5']);
    const p = pairs(ticks, s => s.includes('fi01_2@1.5'), s => s[0] === 'cloud14@1.5');
    expect(p.both).toBe(0);
    expect(p.a).toBeCloseTo(1 / 8, 2);
    expect(p.b).toBeCloseTo(1 / 8, 2);
    expect(ticks.filter(s => s[0] === 'fi02_1@1.5').length / TICKS).toBeCloseTo(1 / 16, 2);
    expect([...p.runs].sort()).toEqual(['aa', 'ab', 'ba', 'bb']);
  });

  // `RenderObjectVisual` runs only for an object in view, so its timer stands still out of it.
  it('makes nothing out of view', async () => {
    made.depth = -100;
    expect((await play(85, 400)).flat()).toEqual([]);
  });
});
