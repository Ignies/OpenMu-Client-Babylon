import { describe, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({ snowGate: null as string | null }));

// The overlay's GLSL and its melt upload are under test. Everything else it
// imports is stubbed, and the real imports reach the store.
vi.mock('../../common/devSeams', () => ({
  devQuery: (key: string) => (key === 'snowGate' ? seam.snowGate : null),
}));
vi.mock('../babylon/exports', async () => ({
  Vector3: (await import('@babylonjs/core/Maths/math.vector')).Vector3,
}));
vi.mock('../../lighting/keyRig', () => ({ sunLightOf: () => null }));
vi.mock('../../common/gameOptions', () => ({
  GameOptions: { advancedEffects: true },
}));
vi.mock('../../weather/snowCover', () => ({
  SNOW_GROUND_MAPS: new Set(),
  snowCover: () => 1,
}));
vi.mock('../../weather/snowTrail', () => ({
  snowTrailPainted: () => false,
  snowTrailTexture: () => null,
}));
vi.mock('../../weather/wetness', () => ({
  puddleCover: () => 0,
  wetness: () => 0,
}));
vi.mock('../../weather/rainState', () => ({ rainStrength: () => 0 }));
vi.mock('../../common/pointLightPool', () => ({
  pointLightPoolLights: () => [],
}));
vi.mock('../../common/lightModel', () => ({ linearBufferActive: () => false }));
vi.mock('../../lighting/director', () => ({ lookDirector: () => null }));
vi.mock('./terrainLighting', () => ({ TERRAIN_BRANCH: true }));

async function load(snowGate: string | null) {
  seam.snowGate = snowGate;
  vi.resetModules();
  const overlay = await import('./terrainOverlay');
  const melt = await import('../../weather/snowMelt');

  return { overlay, melt };
}

type Loaded = Awaited<ReturnType<typeof load>>;

function emitted({ overlay }: Loaded): { body: string; decls: string } {
  const layers = [overlay.SNOW_COVER];

  return {
    body: overlay.terrainOverlayGlsl(layers, 'color', 'open'),
    decls: overlay.terrainOverlayDeclarationsGlsl(layers),
  };
}

/**
 * Babylon's ShaderCodeCursor keeps a whole-line comment intact but splits a
 * code line on every ';', including one inside a trailing comment.
 */
function trailingCommentSemicolons(glsl: string): string[] {
  return glsl.split(/\r?\n/).filter(line => {
    const t = line.trim();
    const c = t.indexOf('//');

    return c > 0 && t.slice(c).includes(';');
  });
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

const BREAK = '\n        if (float(m) >= ovMeltCount) break;';
const COUNT_UNIFORM = '\n  uniform float ovMeltCount;';

/** Bind the snow layer once and record what reached the effect. */
function bind(m: Loaded) {
  const floats: Record<string, number> = {};
  const arrays: Record<string, number[]> = {};
  const effect = {
    setFloat: (name: string, v: number) => void (floats[name] = v),
    setFloat3: () => {},
    setFloat4: () => {},
    setTexture: () => {},
    setArray4: (name: string, values: number[]) =>
      void (arrays[name] = [...values]),
  };

  m.overlay.bindTerrainOverlays(
    effect as never,
    [m.overlay.SNOW_COVER],
    {} as never
  );

  return { floats, arrays };
}

/** One healed slot in front of two live patches. */
function burn(m: Loaded): void {
  const step = (dt: number) => m.melt.snowMeltLayer.update?.(0 as never, dt);

  m.melt.meltSnow(10, 10, 2);
  step(20);
  m.melt.meltSnow(40, 40, 3);
  m.melt.meltSnow(60, 20, 2.5, 0.7);
  step(14);
}

describe('snow melt loop', () => {
  it('stops at the live patch count', async () => {
    const m = await load(null);
    const { body, decls } = emitted(m);

    expect(body).toContain(
      `for (int m = 0; m < ${m.melt.MELT_SPOTS}; m++) {${BREAK}`
    );
    expect(count(body, 'ovMeltCount')).toBe(1);
    expect(decls).toContain(
      `uniform vec4 ovMeltSpot[${m.melt.MELT_SPOTS}];${COUNT_UNIFORM}`
    );
    expect(m.overlay.terrainOverlayUniforms([m.overlay.SNOW_COVER])).toContain(
      'ovMeltCount'
    );
    expect(count(body, '{')).toBe(count(body, '}'));
    expect(trailingCommentSemicolons(body + decls)).toEqual([]);
  });

  it('?snowGate=0 walks every slot, and differs by the gate alone', async () => {
    const gated = emitted(await load(null));
    const m = await load('0');
    const { body, decls } = emitted(m);

    expect(body + decls).not.toContain('ovMeltCount');
    expect(
      m.overlay.terrainOverlayUniforms([m.overlay.SNOW_COVER])
    ).not.toContain('ovMeltCount');
    expect(gated.body.replace(BREAK, '')).toBe(body);
    expect(gated.decls.replace(COUNT_UNIFORM, '')).toBe(decls);
  });

  it('uploads the packed patches and their count', async () => {
    const m = await load(null);
    expect(bind(m).floats.ovMeltCount).toBe(0);

    burn(m);
    const { floats, arrays } = bind(m);

    expect(floats.ovMeltCount).toBe(2);
    expect(arrays.ovMeltSpot.slice(0, 3)).toEqual([40, 40, 3]);
    expect(arrays.ovMeltSpot.slice(4, 7)).toEqual([60, 20, 2.5]);
    expect(arrays.ovMeltSpot.slice(8).every(v => v === 0)).toBe(true);
  });

  it('?snowGate=0 uploads the slots in place and no count', async () => {
    const m = await load('0');
    burn(m);
    const { floats, arrays } = bind(m);

    expect('ovMeltCount' in floats).toBe(false);
    expect(arrays.ovMeltSpot.slice(0, 4)).toEqual([10, 10, 2, 0]);
    expect(arrays.ovMeltSpot.slice(4, 7)).toEqual([40, 40, 3]);
    expect(arrays.ovMeltSpot.slice(8, 11)).toEqual([60, 20, 2.5]);
  });
});
