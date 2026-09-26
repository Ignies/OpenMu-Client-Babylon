import { describe, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({ burnThrottle: null as string | null }));

// Only the scar is under test: the texture, the embers and the options are stubbed.
vi.mock('../common/devSeams', () => ({
  devQuery: (key: string) => (key === 'burnThrottle' ? seam.burnThrottle : null),
}));
vi.mock('../libs/babylon/exports', () => ({
  Constants: {},
  RawTexture: {},
  Texture: {},
  Vector3: class {},
}));
vi.mock('../common/gameOptions', () => ({ GameOptions: { advancedEffects: true } }));
vi.mock('../effects', () => ({ effects: { spawn: () => {} } }));
vi.mock('../effects/recipes', () => ({ FIRE_SPARKS: {} }));

async function load(burnThrottle: string | null) {
  seam.burnThrottle = burnThrottle;
  vi.resetModules();
  return import('./grassBurn');
}

type Burn = Awaited<ReturnType<typeof load>>;

/** mulberry32: the fires' lobe phases and ember bearings, the same for both runs. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;

  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grass by whole tiles, as the field hands it over, with a road and flagstones. */
function grass(x: number, z: number): boolean {
  const tx = Math.floor(x);
  const tz = Math.floor(z);

  if (tx >= 118 && tx <= 120) return false;

  return (tx * 7 + tz * 13) % 11 !== 0;
}

/** Tiles 85..145 on both axes hold every fire the script lights. */
const FROM_TILE = 85;
const TILES = 60;

function scar(m: Burn): Uint8Array {
  // Read off the namespace once: its exports are getters under vitest.
  const { BURN_RES: res, grassBurnAt } = m;
  const side = TILES * res;
  const t0 = FROM_TILE * res;
  const out = new Uint8Array(side * side);

  for (let z = 0; z < side; z++) {
    for (let x = 0; x < side; x++) {
      const v = grassBurnAt((t0 + x + 0.5) / res, (t0 + z + 0.5) / res);
      out[z * side + x] = Math.round(v * 255);
    }
  }

  return out;
}

type Hit = [x: number, z: number, radius: number, strength: number];

/** Frame -> the hits landing before that frame's update. */
function script(): Map<number, Hit[]> {
  const hits = new Map<number, Hit[]>();

  hits.set(0, [[100.3, 100.7, 1.2, 1]]);
  hits.set(40, [[110.2, 99.6, 2.6, 1]]);
  // Inside the first fire: feeds it rather than lighting a second.
  hits.set(100, [[100.6, 100.4, 1.2, 1]]);

  // Inferno's ring, one hit a frame: more fires than slots, so fronts are
  // evicted with rings still owed.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    hits.set(160 + i, [[131.1 + Math.cos(a) * 2.2, 109.3 + Math.sin(a) * 2.2, 1.2, 1]]);
  }

  // A weak front, slow enough that only the time cap stamps it.
  hits.set(500, [[99.8, 131.4, 1.2, 0.35]]);

  // Fed until it runs into the radius cap.
  for (let f = 700; f <= 1200; f += 30) hits.set(f, [[110.2, 125.2, 1.2, 1]]);

  return hits;
}

/**
 * The every-frame stamp and the throttled one side by side, on the same hits,
 * frame times and dice. At each decay pass the scars must match byte for byte;
 * between passes the throttled one may only be behind.
 */
async function lockstep(hits: Map<number, Hit[]>, frames: number, dts: number[], sample: number) {
  const every = await load('0');
  const throttled = await load(null);
  expect(throttled).not.toBe(every);

  const runs = [
    { m: every, random: seeded(7) },
    { m: throttled, random: seeded(7) },
  ];
  let active = runs[0];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => active.random());
  const scene = {} as Parameters<Burn['burnGrass']>[0];

  for (const run of runs) run.m.setGrassProbe(grass);

  let charred = -1;
  let sinceDecay = 0;
  let passes = 0;
  let lagging = 0;

  try {
    for (let frame = 0; frame < frames; frame++) {
      const dt = dts[frame % dts.length];

      for (const run of runs) {
        active = run;
        for (const [x, z, r, s] of hits.get(frame) ?? []) run.m.burnGrass(scene, x, z, r, s);
        run.m.grassBurnLayer.update?.(0 as never, dt);
      }

      // The module's decay clock runs once anything is painted, and nothing
      // in these scripts lives long enough to grow back whole.
      if (charred < 0 && scar(every).some(v => v > 0)) charred = frame;

      let pass = false;
      if (charred >= 0) {
        sinceDecay += dt;
        pass = sinceDecay >= 1;
        if (pass) sinceDecay = 0;
      }

      if (!pass && frame % sample !== 0) continue;

      const a = scar(every);
      const b = scar(throttled);
      let differ = 0;
      let ahead = 0;

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) differ++;
        if (b[i] > a[i]) ahead++;
      }

      expect(ahead, `frame ${frame}`).toBe(0);

      if (pass) {
        passes++;
        expect(differ, `decay pass at frame ${frame}`).toBe(0);
      } else if (differ > 0) {
        lagging++;
      }
    }
  } finally {
    random.mockRestore();
  }

  return { charred, passes, lagging, charredTexels: scar(every).filter(v => v > 0).length };
}

describe('grass burn stamp throttle', () => {
  it('leaves the every-frame scar at every decay pass', { timeout: 60_000 }, async () => {
    const run = await lockstep(script(), 2000, [1 / 60, 1 / 60, 1 / 30, 1 / 144, 1 / 60, 0.05], 8);

    // Not vacuous: fires burnt, passes ran, and the throttle actually held stamps back.
    expect(run.charred).toBe(0);
    expect(run.charredTexels).toBeGreaterThan(2000);
    expect(run.passes).toBeGreaterThan(30);
    expect(run.lagging).toBeGreaterThan(0);
  });

  it('starts the decay clock on the frame the first texel chars', { timeout: 60_000 }, async () => {
    // Too small to cover a texel centre, so the front spreads a while before
    // anything is painted.
    const hits = new Map<number, Hit[]>([[0, [[100.01, 100.01, 0.05, 1]]]]);
    const run = await lockstep(hits, 240, [1 / 60], 2);

    expect(run.charred).toBeGreaterThan(0);
    expect(run.passes).toBeGreaterThanOrEqual(3);
  });
});
