import { describe, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({ terrainBranch: null as string | null }));
const pool = vi.hoisted(() => ({
  lights: [] as { x: number; z: number; range: number; falloff: number; r: number; g: number; b: number }[],
}));

// Everything the module imports is stubbed: the GLSL under test is its own,
// and the real imports reach the store.
vi.mock('../../common/devSeams', () => ({
  devQuery: (key: string) => (key === 'terrainBranch' ? seam.terrainBranch : null),
}));
vi.mock('../../common/terrainDynamicLight', () => ({ getTerrainLightTexture: () => null }));
vi.mock('../../common/pointLightPool', () => ({ pointLightPoolGroundLights: () => pool.lights }));
vi.mock('../../common/lightModel', () => ({
  linearBufferActive: () => false,
  linearLightActive: () => false,
}));
vi.mock('../../lighting/director', () => ({ lookDirector: () => null }));
vi.mock('../../lighting/clouds', () => ({
  bindClouds: () => {},
  cloudFieldGlsl: () => '',
  CLOUD_NOISE_SAMPLER: 'cloudNoise',
  CLOUD_UNIFORMS: [],
}));
vi.mock('../../lighting/profiles', () => ({ SKY_CLOUDS_DEFAULT: {} }));
vi.mock('../../lighting/lightTint', () => ({
  LIGHT_TINT_UNIFORM: 'lightTint',
  lightTintGlsl: () => '',
  lightTintStrength: () => 0,
}));
vi.mock('../../scenes/shadows', () => ({
  TERRAIN_CSM_UNIFORMS: [],
  bindTerrainCsm: () => {},
  terrainCsmDefines: () => [],
  terrainCsmGlsl: () => '',
}));
vi.mock('../../common/renderingStyle', () => ({
  TOON_FILTER_UNIFORM: 'muToonFilter',
  bindToonFilter: () => {},
  toonFunctionsGlsl: () => '',
  toonTerrainDefines: () => [],
}));

async function load(terrainBranch: string | null) {
  seam.terrainBranch = terrainBranch;
  vi.resetModules();
  return import('./terrainLighting');
}

function emitted(m: Awaited<ReturnType<typeof load>>): string {
  return [
    m.terrainSkyLightGlsl(),
    m.terrainGroundLightGlsl({ bake: 'vBake', clouds: true }),
    m.terrainOutputDecodeGlsl('f'),
  ].join('\n');
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

describe('terrain light GLSL', () => {
  it('branches on the tier uniforms and skips empty pool slots', async () => {
    const m = await load(null);
    const glsl = emitted(m);

    expect(m.TERRAIN_BRANCH).toBe(true);
    expect(glsl).toMatch(
      new RegExp(
        String.raw`if \(linearLight > 0\.5\) \{\s*for \(int i = 0; i < ${m.GROUND_POINT_LIGHTS}; i\+\+\) \{\s*` +
          String.raw`vec4 gl = groundLightPos\[i\];\s*if \(gl\.z <= 0\.0\) continue;`
      )
    );
    expect(glsl).toContain('} else {');
    expect(glsl).toContain('if (linearOut > 0.5) f = pow(max(f, vec3(0.0)), vec3(2.2));');

    // No uniform left weighting a mix or a product: each side runs alone.
    expect(glsl).not.toMatch(/,\s*linear(Light|Out)\)/);
    expect(glsl).not.toMatch(/\*\s*linear(Light|Out)\b/);
    expect(count(glsl, '{')).toBe(count(glsl, '}'));
    expect(trailingCommentSemicolons(glsl)).toEqual([]);
  });

  it('?terrainBranch=0 emits the old branch-free mixes', async () => {
    const m = await load('0');
    const glsl = emitted(m);

    expect(m.TERRAIN_BRANCH).toBe(false);
    expect(glsl).not.toContain('if (linear');
    expect(glsl).not.toContain('continue');
    for (const line of [
      'dynLight += groundLightCol[i].rgb * pow(gf, gl.w) * linearLight * roomParams.y;',
      'vec3 bakeLit = mix(bake, pow(bake, vec3(2.2)), linearLight) * roomParams.z;',
      'groundLight = mix(min(groundLight, vec3(1.0)), softCeil, linearLight);',
      'vec3 groundLit = mix(groundLight, pow(groundLight, vec3(1.0 / 2.2)), linearLight);',
      'vec3 extraLit = mix(dynLight, pow(dynLight * keyGain, vec3(1.0 / 2.2)), linearLight);',
      'f = mix(f, pow(max(f, vec3(0.0)), vec3(2.2)), linearOut);',
    ]) {
      expect(glsl).toContain(line);
    }
    expect(count(glsl, '{')).toBe(count(glsl, '}'));
    expect(trailingCommentSemicolons(glsl)).toEqual([]);
  });

  it('binds range 0 for every slot the pool does not fill', async () => {
    const m = await load(null);
    const arrays: Record<string, number[]> = {};
    const effect = {
      setFloat: () => {},
      setFloat3: () => {},
      setTexture: () => {},
      setArray4: (name: string, values: number[]) => void (arrays[name] = [...values]),
    };
    const lit = { x: 10, z: 20, range: 3, falloff: 2, r: 1, g: 0.5, b: 0.25 };
    const cleared = { x: 0, z: 0, range: 0, falloff: 1, r: 0, g: 0, b: 0 };

    pool.lights = [lit, cleared];
    m.bindTerrainLight(effect as never, {} as never, false);

    const ranges = Array.from({ length: m.GROUND_POINT_LIGHTS }, (_, i) => arrays.groundLightPos[i * 4 + 2]);
    expect(ranges).toEqual([3, ...new Array(m.GROUND_POINT_LIGHTS - 1).fill(0)]);
  });
});
