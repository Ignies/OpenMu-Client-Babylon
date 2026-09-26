import { describe, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({ printFast: null as string | null }));

type Source = { vertexSource: string; fragmentSource: string };
type BindHook = (mesh: unknown) => void;

const made = vi.hoisted(
  () =>
    [] as {
      source: Source;
      uniforms: string[];
      onBind: BindHook[];
    }[]
);

// The shaders and their bind hook are under test. Babylon is stubbed down to
// what building one material and one pool touches.
vi.mock('../common/devSeams', () => ({
  devQuery: (key: string) => (key === 'printFast' ? seam.printFast : null),
}));
vi.mock('../lighting/keyRig', () => ({ sunLightOf: () => null }));
vi.mock('../common/lightModel', () => ({ linearBufferActive: () => false }));
vi.mock('./recipes', () => ({
  DRAWN_SHAPES: ['boot', 'paw', 'claw', 'hoof', 'chitin', 'pad'],
}));
vi.mock('../libs/babylon/exports', async () => {
  const vectors = await import('@babylonjs/core/Maths/math.vector');

  class ShaderMaterial {
    onBindObservable = {
      add: (hook: BindHook) => this.record.onBind.push(hook),
    };
    onDisposeObservable = { addOnce: () => undefined };
    private record: (typeof made)[number];

    constructor(
      _name: string,
      private scene: unknown,
      source: Source,
      options: { uniforms: string[] }
    ) {
      this.record = { source, uniforms: options.uniforms, onBind: [] };
      made.push(this.record);
    }

    getScene() {
      return this.scene;
    }

    setTexture() {}
    setFloat() {}
    setVector2() {}
    setVector3() {}
    setVector4() {}
    dispose() {}
  }

  return {
    Constants: { ALPHA_PREMULTIPLIED: 7 },
    Matrix: vectors.Matrix,
    Vector2: vectors.Vector2,
    Vector3: vectors.Vector3,
    Vector4: vectors.Vector4,
    Texture: { BILINEAR_SAMPLINGMODE: 2, CLAMP_ADDRESSMODE: 0 },
    RawTexture: {
      CreateRGBATexture: () => ({
        update: () => undefined,
        dispose: () => undefined,
      }),
    },
    CreatePlane: (_name: string, _options: unknown, scene: unknown) => ({
      rotation: { x: 0 },
      bakeCurrentTransformIntoVertices: () => undefined,
      thinInstanceSetBuffer: () => undefined,
      setEnabled: () => undefined,
      isDisposed: () => false,
      getScene: () => scene,
      dispose: () => undefined,
    }),
    ShaderMaterial,
  };
});

/** Build the snow material under the given seam value and return it. */
async function build(printFast: string | null, stencil = { on: false }) {
  seam.printFast = printFast;
  made.length = 0;
  vi.resetModules();

  const footprints = await import('./footprints');
  const scene = { getEngine: () => ({ getStencilBuffer: () => stencil.on }) };
  footprints.warmFootprints(scene as never, 'boot', ['snow'], false);

  expect(made).toHaveLength(1);

  return made[0];
}

/**
 * Babylon's ShaderCodeCursor keeps a whole-line comment intact but splits a
 * code line on every ';', including one inside a trailing comment.
 */
function trailingCommentSemicolons(glsl: string): string[] {
  return glsl.split('\n').filter(line => {
    const t = line.trim();
    const c = t.indexOf('//');

    return c > 0 && t.slice(c).includes(';');
  });
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

const DISCARD = 'if (printCull > 0.5 && coverage * vColor.a <= 0.0) discard;';
const SHADOW_SKIP = 'if (depth > 0.0) {';
const SHADOW_LOOP = 'for (int i = 1; i <= SHADOW_STEPS; i++) {';

describe('footprint early-outs (?printFast)', () => {
  it('drops strength-0 texels after the last sole fetch, before the normal and the shadow march', async () => {
    const { fragmentSource: fs } = (await build(null)).source;

    const lastFetch = fs.lastIndexOf('texture2D(soleSampler, uv)');
    const coverage = fs.indexOf('float coverage = sole.a;');
    const discard = fs.indexOf(DISCARD);

    expect(coverage).toBeGreaterThan(lastFetch);
    expect(discard).toBeGreaterThan(coverage);
    expect(discard).toBeLessThan(fs.indexOf('float nx ='));
    expect(fs.indexOf(SHADOW_SKIP)).toBeGreaterThan(discard);
    expect(fs.indexOf(SHADOW_LOOP)).toBeGreaterThan(fs.indexOf(SHADOW_SKIP));
    expect(count(fs, '{')).toBe(count(fs, '}'));
  });

  it('parks a dead slot outside the clip volume, under the instance colour define', async () => {
    const { vertexSource: vs } = (await build(null)).source;

    const placed = vs.indexOf('gl_Position = viewProjection * worldPos;');
    const cull = vs.indexOf('instanceColor.a <= 0.0');
    const guard = vs.lastIndexOf('#ifdef INSTANCESCOLOR', cull);

    expect(cull).toBeGreaterThan(placed);
    expect(guard).toBeGreaterThan(placed);
    expect(vs.indexOf('#endif', cull)).toBeGreaterThan(cull);
    expect(vs).toContain('gl_Position = vec4(2.0, 2.0, 2.0, 1.0);');
  });

  it('declares printCull in both stages and keeps trailing comments free of semicolons', async () => {
    const { source, uniforms } = await build(null);

    expect(uniforms).toContain('printCull');
    expect(source.vertexSource).toContain('uniform float printCull;');
    expect(source.fragmentSource).toContain('uniform float printCull;');
    expect(trailingCommentSemicolons(source.vertexSource)).toEqual([]);
    expect(trailingCommentSemicolons(source.fragmentSource)).toEqual([]);
  });

  it('only lets fragments drop while the stencil test is off', async () => {
    const stencil = { on: false };
    const { onBind } = await build(null, stencil);
    const floats: Record<string, number> = {};
    const mesh = {
      subMeshes: [
        {
          effect: {
            setFloat: (name: string, value: number) => {
              floats[name] = value;
            },
          },
        },
      ],
    };

    expect(onBind).toHaveLength(1);

    onBind[0](mesh);
    expect(floats.printCull).toBe(1);

    // A hovered model: the highlight layer turns the stencil test on, and a
    // texel that blends to nothing still writes the stencil.
    stencil.on = true;
    onBind[0](mesh);
    expect(floats.printCull).toBe(0);
  });

  it('only inserts lines into the old shader, with no semicolon in a new comment', async () => {
    const slow = (await build('0')).source;
    const fast = (await build(null)).source;

    for (const stage of ['vertexSource', 'fragmentSource'] as const) {
      const old = slow[stage].split('\n');
      const added: string[] = [];
      let kept = 0;

      for (const line of fast[stage].split('\n')) {
        if (kept < old.length && line === old[kept]) kept++;
        else added.push(line);
      }

      expect(kept).toBe(old.length);
      expect(added.length).toBeGreaterThan(0);
      expect(added.filter(l => l.includes('//') && l.includes(';'))).toEqual([]);
    }
  });

  it('?printFast=0 builds the old shader with no uniform and no bind hook', async () => {
    const { source, uniforms, onBind } = await build('0');

    for (const glsl of [source.vertexSource, source.fragmentSource]) {
      expect(glsl).not.toContain('printCull');
      expect(glsl).not.toContain('discard');
      expect(glsl).not.toContain(SHADOW_SKIP);
    }

    expect(source.fragmentSource).toContain(SHADOW_LOOP);
    expect(uniforms).not.toContain('printCull');
    expect(onBind).toEqual([]);
  });
});
