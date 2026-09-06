import {
  Constants,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQueryNumber, devQueryNumbers } from '../common/devSeams';

/**
 * The MU tone curve (sky_atmospherics ARCHITECTURE §2b, lighting_polish §13
 * item 13): sole owner of the tone-mapping post-process, run on the linear
 * HDR buffer before the rendering pipeline so bloom, sharpen and the grade
 * downstream are unchanged.
 *
 * Why it exists. Babylon's three curves are fixed shapes and none of them
 * has both a toe and a real shoulder. With `Standard` the plaza's mid grey
 * lands at p50 0.435 while p95 sits at 0.694: the distribution is too wide
 * at both ends, so a bright texel (a birch trunk, a plaster wall) clips to
 * white while the mid tone is under its band, and no exposure closes that -
 * exposure translates the distance, it never compresses it.
 *
 * The curve is a generalised Reinhard shoulder with a separate toe, applied
 * to luminance with the chroma carried through unchanged, so it moves level
 * and never hue; a small desaturation at the very top lets an emitter core
 * reach white rather than a saturated flat.
 */

const SHADER = 'muToneMap';

/**
 * The curve, as four numbers that mean something on their own. Uchimura's GT
 * operator was tried first and rejected by measurement: its shoulder is
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

const gtDev = devQueryNumbers('gt', 4);
const desatDev = devQueryNumbers('desat', 2);
const toneDev = devQueryNumber('tone');

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

/** The viewer's brightness trim; the map's level is already in the key. */
let exposure = 1;

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float exposure;
  uniform vec4 gtA;   // shoulder power, mid, toe gamma, toe knee
  uniform vec2 gtB;   // desat start, desat amount

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  float muCurve(float x) {
    float s = pow(x, gtA.x);
    float shoulder = s / (s + pow(gtA.y, gtA.x));

    // The toe is a gamma that fades out at the knee, so it deepens the
    // bottom without touching the mid tone the shoulder just placed.
    float w = 1.0 - smoothstep(0.0, gtA.w, shoulder);

    return mix(shoulder, pow(shoulder, gtA.z), w);
  }

  void main(void) {
    vec4 src = texture2D(textureSampler, vUV);
    vec3 c = max(src.rgb, vec3(0.0)) * exposure;

    float lum = dot(c, LUMA);

    if (lum <= 1e-5) {
      gl_FragColor = vec4(vec3(0.0), src.a);
      return;
    }

    float mapped = muCurve(lum);

    // Chroma rides the luminance change, so the curve moves level only.
    vec3 outColor = c * (mapped / lum);

    // Past the shoulder an emitter core has to be able to reach white, or a
    // saturated flame reads as a flat orange plate instead of a hot core.
    float t = smoothstep(gtB.x, 1.0, mapped) * gtB.y;
    outColor = mix(outColor, vec3(mapped), t);

    gl_FragColor = vec4(min(outColor, vec3(1.0)), src.a);
  }
  `;
}

function createPass(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerShader();

  const pass = new PostProcess(
    'muToneMap',
    SHADER,
    ['exposure', 'gtA', 'gtB'],
    [],
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
    effect.setFloat('exposure', exposure);
    effect.setFloat4('gtA', curve[0], curve[1], curve[2], curve[3]);
    effect.setFloat2('gtB', desat[0], desat[1]);
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
 * Live while the map is shaped, post is on and the viewer picked this curve
 * (`toneMapper` 1). Returns true when the chain changed, like the haze:
 * the post chain has to be re-attached behind a new pass.
 *
 * Dev seams: `?tone=0` forces it off, `?gt=shoulder,mid,toeGamma,toeKnee`
 * replaces the curve, `?desat=start,amount` the highlight roll to white.
 */
export function syncToneMap(
  scene: Scene,
  camera: ArcRotateCamera,
  want: boolean,
  brightness: number
): boolean {
  exposure = brightness;

  const live = want && toneDev !== 0;

  if (runtime && (!live || runtime.scene !== scene)) {
    disposeToneMap();
    if (!live) return true;
  }

  if (!live || runtime) return false;

  runtime = { scene, camera, pass: createPass(scene, camera) };

  return true;
}

export function toneMapLive(): boolean {
  return runtime !== null;
}
