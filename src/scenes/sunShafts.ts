import {
  Constants,
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  Vector3,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { devQueryNumber } from '../common/devSeams';
import type { LightingTier } from '../common/lightingQuality';
import type { Rgb } from '../lighting/profiles';

/**
 * Sun rays (sky_atmospherics ARCHITECTURE §5): sole owner of the shaft
 * post-process, between the haze and the post chain.
 *
 * The occluder mask is free. The G-buffer holds no blend mesh and no sky
 * dome, so `depth == 0` is exactly "sky", which is the same fact the haze
 * already leans on; everything solid between the camera and the sun is
 * therefore an occluder with no second render of anything. The shafts are N
 * radial taps of that mask toward the sun's screen position, added to the
 * scene before the tone curve because they are scene light, not decoration.
 *
 * Dev seam: `?shafts=<weight>` replaces the option (0 = no pass).
 */

const SHADER = 'muSunShafts';

/** Taps per tier index; Ultra doubles the count, nothing else changes. */
const TAPS: readonly number[] = [0, 12, 24];

/** How much of the way to the sun the taps cover, and their falloff. */
const DENSITY = 0.75;
const DECAY = 0.94;

/** Weight at the top slider notch. */
const MAX_WEIGHT = 0.55;

const SLIDER_MAX = 9;

/**
 * How far outside the frame the sun may sit and still throw shafts. Past this
 * the weight is zero; the falloff is what keeps a shaft from snapping on as
 * the camera turns.
 */
const OFF_SCREEN_REACH = 1.1;

const shaftsDev = devQueryNumber('shafts');

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  taps: number;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

const shown = {
  /** Sun position in UV, and the weight after the off-screen falloff. */
  u: 0.5,
  v: 0.5,
  weight: 0,
  color: [1, 1, 1] as [number, number, number],
};

function registerShader(taps: number): void {
  const name = `${SHADER}${taps}`;

  if (ShaderStore.ShadersStore[`${name}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${name}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;
  uniform vec3 sunScreen;   // u, v, weight
  uniform vec3 sunColor;

  const int TAPS = ${taps};
  const float DENSITY = ${DENSITY.toFixed(3)};
  const float DECAY = ${DECAY.toFixed(3)};

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);

    if (sunScreen.z <= 0.0) {
      gl_FragColor = color;
      return;
    }

    vec2 march = (vUV - sunScreen.xy) * (DENSITY / float(TAPS));
    vec2 uv = vUV;
    float weight = 1.0;
    vec3 sum = vec3(0.0);
    float total = 0.0;

    for (int i = 0; i < TAPS; i++) {
      uv -= march;

      // Outside the frame there is nothing sampled and nothing to add; the
      // clamped read would smear the frame edge along the shaft instead.
      float inside = step(0.0, uv.x) * step(uv.x, 1.0)
        * step(0.0, uv.y) * step(uv.y, 1.0);

      // Sky is depth 0, and sky is the only thing a shaft comes out of.
      float sky = 1.0 - step(1e-6, texture2D(depthSampler, uv).r);

      sum += texture2D(textureSampler, uv).rgb * sky * weight * inside;
      total += weight;
      weight *= DECAY;
    }

    gl_FragColor = vec4(
      color.rgb + sum / max(total, 1e-4) * sunColor * sunScreen.z,
      color.a
    );
  }
  `;
}

function createPass(
  scene: Scene,
  camera: ArcRotateCamera,
  taps: number
): PostProcess {
  registerShader(taps);

  const pass = new PostProcess(
    'sunShafts',
    `${SHADER}${taps}`,
    ['sunScreen', 'sunColor'],
    ['depthSampler'],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  pass.onApply = effect => {
    const gbuffer = scene.geometryBufferRenderer;
    if (!gbuffer) return;

    const index = gbuffer.getTextureIndex(
      GeometryBufferRenderer.DEPTH_TEXTURE_TYPE
    );

    effect.setTexture('depthSampler', gbuffer.getGBuffer().textures[index]);
    effect.setFloat3('sunScreen', shown.u, shown.v, shown.weight);
    effect.setFloat3('sunColor', shown.color[0], shown.color[1], shown.color[2]);
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeSunShafts(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

const sunPoint = new Vector3();
const projected = new Vector3();

/**
 * The sun's screen position and the weight that follows it off frame. The sun
 * is a direction, so it is projected as a point a long way up that direction;
 * behind the camera it throws nothing.
 */
function placeSun(
  scene: Scene,
  camera: ArcRotateCamera,
  direction: readonly [number, number, number],
  slider: number
): void {
  const norm = 1 / (Math.hypot(direction[0], direction[1], direction[2]) || 1);

  sunPoint.set(
    camera.globalPosition.x - direction[0] * norm * 4000,
    camera.globalPosition.y - direction[1] * norm * 4000,
    camera.globalPosition.z - direction[2] * norm * 4000
  );

  Vector3.TransformCoordinatesToRef(sunPoint, camera.getViewMatrix(), projected);

  if (projected.z <= 0) {
    shown.weight = 0;
    return;
  }

  Vector3.TransformCoordinatesToRef(sunPoint, scene.getTransformMatrix(), projected);

  shown.u = projected.x * 0.5 + 0.5;
  shown.v = projected.y * 0.5 + 0.5;

  // Distance from the frame in UV, 0 inside it. The weight fades over the
  // reach rather than switching, so a shaft never snaps on as the camera
  // turns.
  const dx = Math.max(0, Math.abs(shown.u - 0.5) - 0.5);
  const dy = Math.max(0, Math.abs(shown.v - 0.5) - 0.5);
  const out = Math.hypot(dx, dy);

  shown.weight =
    out >= OFF_SCREEN_REACH
      ? 0
      : slider * (1 - out / OFF_SCREEN_REACH) ** 2;
}

/**
 * Built while the map has a sky, no room owns the frame, the option is above
 * zero and there is a G-buffer to read the occluders from. Returns true when
 * the chain changed.
 */
export function syncSunShafts(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier | null,
  tierIndex: number,
  look: {
    /** The map's sun colour in linear, or null where there is no sky to shine through. */
    readonly sunColor: Rgb | null;
    readonly direction: readonly [number, number, number];
  },
  post: boolean
): boolean {
  const slider = Math.max(
    0,
    Math.min(SLIDER_MAX, shaftsDev ?? GameOptions.sunShafts)
  );

  const wanted =
    tier !== null &&
    post &&
    slider > 0 &&
    look.sunColor !== null &&
    scene.geometryBufferRenderer !== null;

  if (wanted) {
    shown.color[0] = look.sunColor![0];
    shown.color[1] = look.sunColor![1];
    shown.color[2] = look.sunColor![2];
    placeSun(scene, camera, look.direction, (slider / SLIDER_MAX) * MAX_WEIGHT);
  } else {
    shown.weight = 0;
  }

  const taps = TAPS[tierIndex] ?? TAPS[1];

  if (runtime && (!wanted || runtime.scene !== scene || runtime.taps !== taps)) {
    disposeSunShafts();
    if (!wanted) return true;
  }

  if (!wanted || runtime) return false;

  runtime = { scene, camera, taps, pass: createPass(scene, camera, taps) };

  return true;
}

export function sunShaftsLive(): boolean {
  return runtime !== null;
}
