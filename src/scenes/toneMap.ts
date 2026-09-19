import {
  Constants,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQueryNumber, devQueryNumbers } from '../common/devSeams';
import { toonEffectsActive } from '../common/renderingStyle';
import { EFFECT_MASK_SAMPLER, effectMask } from './effectMask';
import { heightFogLive } from './heightFog';

/**
 * The tone pass: where the frame goes display-referred. Sole owner of the
 * tone-mapping post-process, run on the linear HDR buffer after the last
 * scene-light pass and before the rendering pipeline, so bloom, sharpen and
 * the grade downstream read a rolled buffer.
 *
 * Two halves (effects_composite ARCHITECTURE §2):
 *
 *  1. **The curve**, on the surface. The viewer's brightness, then one of
 *     four: the MU curve, Babylon's ACES fit, the Khronos PBR neutral
 *     mapper, or a plain clip. The MU curve is the default and exists
 *     because Babylon's three are fixed shapes with no toe and shoulder of
 *     their own (sky_atmospherics §2b, lighting_polish §13 item 13): a
 *     generalised Reinhard shoulder with a separate toe, applied to
 *     luminance with the chroma carried through, so it moves level and
 *     never hue; a small desaturation at the top lets an emitter core reach
 *     white. The other three are copied from `imageProcessingFunctions`
 *     term for term, so `aces` and `neutral` look as they did in the
 *     image-processing pass.
 *
 *  2. **The composite**, after it. The additive half of the frame - what the
 *     effect mask holds, thinned by the haze's transmittance in the frame's
 *     alpha - is taken out before the curve and added back at the value the
 *     art was authored at: `lightCardGain` put `authored^2.2 x keyGain` in
 *     the buffer, and `(e / keyGain)^(1/2.2)` is the card again. The add and
 *     the clamp at 1 are the original's blend on its display buffer, which
 *     is what a bolt with a hot white core is. The halo, the pool light and
 *     the glow layer are scene light and stay in the surface.
 */

const SHADER = 'muToneMap';

/**
 * The MU curve, as four numbers that mean something on their own. Uchimura's
 * GT operator was tried first and rejected by measurement: its shoulder is
 * derived from its mid slope, so buying a toe there costs a mid expansion
 * that took the plaza's p95 from 0.694 to 0.792.
 *
 * - `shoulder` (< 1) is the power of a generalised Reinhard, `x^s / (x^s +
 *   k^s)`. Below 1 it compresses the top hard, which is the whole point: a
 *   bright texel in full key sits at about 2.4 linear and has to land near
 *   0.8 display rather than clipping to white.
 * - `mid` is the scene value that maps to half, so it is the exposure of the
 *   curve itself and the map's `ev` stays what it is.
 * - `toeGamma` deepens the bottom; `toeKnee` is where it stops, so the toe
 *   cannot reach the mid tone and flatten it.
 */
const CURVE = [0.75, 1.10, 1.30, 0.28] as const;

/** Where the highlight desaturation starts, and how much of it there is. */
const DESAT = [0.8, 0.55] as const;

/** `GameOptions.toneMapper`: 0 none / 1 MU / 2 aces / 3 neutral. */
const MAPPERS = ['none', 'mu', 'aces', 'neutral'] as const;

const gtDev = devQueryNumbers('gt', 4);
const desatDev = devQueryNumbers('desat', 2);
const toneDev = devQueryNumber('tone');
const fxDisplayDev = devQueryNumber('fxdisplay');

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  mapper: number;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

/** What the director hands the pass each tick. */
export type ToneLook = {
  /** A graded tier with post processing on. */
  readonly live: boolean;
  /** Index into `GameOptions.toneMapper`'s values. */
  readonly mapper: number;
  /** The viewer's brightness trim; the map's level is already in the key. */
  readonly brightness: number;
  /** `2^ev`, what `lightCardGain` put on the effect art. */
  readonly keyGain: number;
};

const shown = { brightness: 1, keyGain: 1 };

function shaderName(mapper: number): string {
  return `${SHADER}_${MAPPERS[mapper] ?? 'mu'}`;
}

/** The curve for one mapper, as a GLSL function `vec3 mapped(vec3 c)` over [0, inf). */
function curveGlsl(mapper: number): string {
  switch (MAPPERS[mapper]) {
    case 'none':
      return `
  vec3 mapped(vec3 c) {
    return min(c, vec3(1.0));
  }`;
    case 'aces':
      // Babylon's fitted ACES, imageProcessingFunctions TONEMAPPING 2.
      return `
  const mat3 ACESInputMat = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 ACESOutputMat = mat3(
    vec3( 1.60475, -0.10208, -0.00327),
    vec3(-0.53108,  1.10813, -0.07276),
    vec3(-0.07367, -0.00605,  1.07602)
  );

  vec3 rrtAndOdtFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }

  vec3 mapped(vec3 c) {
    c = ACESInputMat * c;
    c = rrtAndOdtFit(c);
    c = ACESOutputMat * c;
    return clamp(c, 0.0, 1.0);
  }`;
    case 'neutral':
      // Khronos PBR neutral, imageProcessingFunctions TONEMAPPING 3.
      return `
  const float NEUTRAL_START = 0.8 - 0.04;
  const float NEUTRAL_DESAT = 0.15;

  vec3 mapped(vec3 c) {
    float x = min(c.r, min(c.g, c.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    c -= offset;
    float peak = max(c.r, max(c.g, c.b));
    if (peak < NEUTRAL_START) return clamp(c, 0.0, 1.0);
    float d = 1.0 - NEUTRAL_START;
    float newPeak = 1.0 - d * d / (peak + d - NEUTRAL_START);
    c *= newPeak / peak;
    float g = 1.0 - 1.0 / (NEUTRAL_DESAT * (peak - newPeak) + 1.0);
    return clamp(mix(c, vec3(newPeak), g), 0.0, 1.0);
  }`;
    default:
      return `
  float muCurve(float x) {
    float s = pow(x, gtA.x);
    float shoulder = s / (s + pow(gtA.y, gtA.x));

    // The toe is a gamma that fades out at the knee, so it deepens the
    // bottom without touching the mid tone the shoulder just placed.
    float w = 1.0 - smoothstep(0.0, gtA.w, shoulder);

    return mix(shoulder, pow(shoulder, gtA.z), w);
  }

  vec3 mapped(vec3 c) {
    float lum = dot(c, LUMA);

    if (lum <= 1e-5) return vec3(0.0);

    float m = muCurve(lum);

    // Chroma rides the luminance change, so the curve moves level only.
    vec3 outColor = c * (m / lum);

    // Past the shoulder an emitter core has to be able to reach white, or a
    // saturated flame reads as a flat orange plate instead of a hot core.
    float t = smoothstep(gtB.x, 1.0, m) * gtB.y;
    outColor = mix(outColor, vec3(m), t);

    return min(outColor, vec3(1.0));
  }`;
  }
}

function registerShader(mapper: number): void {
  const name = shaderName(mapper);

  if (ShaderStore.ShadersStore[`${name}FragmentShader`]) return;

  // No semicolons in the GLSL comments: the shader preprocessor splits on them.
  ShaderStore.ShadersStore[`${name}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform float exposure;
  uniform vec4 gtA;   // shoulder power, mid, toe gamma, toe knee
  uniform vec2 gtB;   // desat start, desat amount
  uniform vec3 fx;    // composite on, 1 / keyGain, alpha carries the transmittance

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
${curveGlsl(mapper)}

  void main(void) {
    vec4 src = texture2D(textureSampler, vUV);
    vec3 lit = max(src.rgb, vec3(0.0));

    // The additive half still in the frame: the mask, thinned by whatever
    // the haze took, bounded by the frame itself.
    float t = mix(1.0, src.a, fx.z);
    vec3 e = min(max(texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb, vec3(0.0)) * t, lit) * fx.x;
    vec3 surface = lit - e;

    vec3 outColor = mapped(surface * exposure);

    // The art as authored, added the way the original added it.
    vec3 art = pow(e * fx.y, vec3(1.0 / 2.2));

    gl_FragColor = vec4(min(outColor + art, vec3(1.0)), 1.0);
  }
  `;
}

function createPass(scene: Scene, camera: ArcRotateCamera, mapper: number): PostProcess {
  registerShader(mapper);

  const pass = new PostProcess(
    'muToneMap',
    shaderName(mapper),
    ['exposure', 'gtA', 'gtB', 'fx'],
    [EFFECT_MASK_SAMPLER],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  const curve = gtDev ?? CURVE;
  const desat = desatDev ?? DESAT;

  pass.onApply = effect => {
    const mask = effectMask();
    // Off under the anime effects toggle: that pass owns the effects' look.
    const composite = mask !== null && fxDisplayDev !== 0 && !toonEffectsActive();

    if (mask) effect.setTexture(EFFECT_MASK_SAMPLER, mask);

    effect.setFloat('exposure', shown.brightness);
    effect.setFloat4('gtA', curve[0], curve[1], curve[2], curve[3]);
    effect.setFloat2('gtB', desat[0], desat[1]);
    effect.setFloat3(
      'fx',
      composite ? 1 : 0,
      1 / Math.max(shown.keyGain, 1e-4),
      heightFogLive() ? 1 : 0
    );
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeToneMap(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

/**
 * Live while the map is shaped and post is on, for every mapper. Returns
 * true when the chain changed, like the haze: the post chain has to be
 * re-attached behind a new pass. `upstreamChanged` (a pass ahead of it was
 * rebuilt this tick) re-attaches the pass behind it without rebuilding it.
 *
 * Dev seams: `?tone=0` forces it off (image processing maps instead, and
 * there is no composite), `?gt=shoulder,mid,toeGamma,toeKnee` replaces the
 * MU curve, `?desat=start,amount` its highlight roll to white,
 * `?fxdisplay=0` leaves the effects in the linear frame to take the curve.
 */
export function syncToneMap(
  scene: Scene,
  camera: ArcRotateCamera,
  look: ToneLook,
  upstreamChanged: boolean
): boolean {
  shown.brightness = look.brightness;
  shown.keyGain = look.keyGain;

  const live = look.live && toneDev !== 0;
  const mapper = Math.max(0, Math.min(MAPPERS.length - 1, Math.round(look.mapper)));

  if (runtime && (!live || runtime.scene !== scene || runtime.mapper !== mapper)) {
    disposeToneMap();
    if (!live) return true;
  }

  if (runtime && upstreamChanged) {
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);
    return true;
  }

  if (!live || runtime) return false;

  runtime = { scene, camera, mapper, pass: createPass(scene, camera, mapper) };

  return true;
}

export function toneMapLive(): boolean {
  return runtime !== null;
}
