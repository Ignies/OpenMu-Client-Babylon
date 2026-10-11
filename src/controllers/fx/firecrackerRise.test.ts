import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** Every burst asked for: its size, where, and its recipe's look. */
const seen = vi.hoisted(() => ({
  bursts: [] as { count: number; x: number; y: number; z: number; size: number; life: number; colour: number[] }[],
  sounds: [] as string[],
}));
vi.mock('./core', async importOriginal => ({
  ...(await importOriginal<typeof import('./core')>()),
  emitBurst: (_scene: unknown, r: { size: number; life: number; colour: number[] }, at: { x: number; y: number; z: number }, count: number) =>
    void seen.bursts.push({ count, x: at.x, y: at.y, z: at.z, size: r.size, life: r.life, colour: [...r.colour] }),
}));
vi.mock('../sound/sfx', async importOriginal => ({
  ...(await importOriginal<typeof import('../sound/sfx')>()),
  playSfx: (name: string) => void seen.sounds.push(name),
}));
vi.mock('../lighting', () => ({ lighting: { flash: () => ({ stop() {} }) } }));

const { clearTimers, stepClock, TICK } = await import('./core');
const { spawnFirecrackerRise } = await import('./firecrackerRise');

const scene = {} as never;
const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) stepClock(TICK);
};

afterEach(() => {
  clearTimers();
  seen.bursts.length = 0;
  seen.sounds.length = 0;
  vi.restoreAllMocks();
});

// BITMAP_FIRECRACKERRISE (ZzzEffect.cpp:2893-2897, MoveHandlers.cpp:4898-4928, ZzzEffectParticle.cpp:2792-2808).
describe('the soccer score fireworks', () => {
  it('fire a rocket on a fifth tick one time in three, which climbs 12 ticks and bursts into 80 sparks', () => {
    // rand() % 3 == 0 every time: all fifteen chances fire; rand() % 9 - 4 is -4.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    spawnFirecrackerRise(scene, 60, 155);
    run(100);
    const bursts = seen.bursts.filter(b => b.count === 80);
    const trail = seen.bursts.filter(b => b.count === 1);
    expect(bursts).toHaveLength(15);
    expect(trail).toHaveLength(15 * 12);
    expect(seen.sounds).toEqual(Array(15).fill('Sound/eFirecracker2'));
    // From the square's centre at a flat 100 cm, 11 moves of (-4, -4, 26) cm.
    expect(bursts[0].x).toBeCloseTo(60.5 - 0.44);
    expect(bursts[0].z).toBeCloseTo(155.5 - 0.44);
    expect(bursts[0].y).toBeCloseTo(1 + 2.86);
    // Fire04 at Scale 0.1 for 50 ticks; the trail at 0.25 for 2.
    expect(bursts[0].size).toBeCloseTo(0.064);
    expect(bursts[0].life).toBeCloseTo(50 * TICK);
    expect(trail[0].size).toBeCloseTo(0.16);
    expect(trail[0].y).toBeCloseTo(1);
  });

  it('fire nothing when every roll misses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    spawnFirecrackerRise(scene, 60, 155);
    run(100);
    expect(seen.bursts).toEqual([]);
  });

  // `(rand() % 3 * 0.3 + 0.4, rand() % 4 * 0.1, 0)`, turned through the channels at `LifeTime / 4 + SubType`.
  it('colour a burst from its two rolls, turned for its sub', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    spawnFirecrackerRise(scene, 60, 155);
    run(12);
    // Red 0.4, green 0 and sub 0: born at 12, each channel turned one on and a fifth toward the next.
    const colour = seen.bursts.find(b => b.count === 80)?.colour ?? [];
    [0, 0.08, 0.32].forEach((want, k) => expect(colour[k]).toBeCloseTo(want));
  });
});
