import {
  Constants,
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';
import { frameGenWantsVelocity } from './frameGen';

/**
 * Motion vectors: the geometry buffer's velocity target, behind the
 * `?velocity=` dev seam, plus a debug view of the field.
 *
 * Nothing consumes the buffer. It exists to be measured. TAA, motion blur and
 * any form of frame interpolation all need this one target, and until it is
 * built and priced none of them can be argued about honestly.
 *
 * Two things about the field have to be known before anything reads it:
 *
 *  - It holds what `occludes` lets into the G-buffer (ambientOcclusion.ts):
 *    terrain and solid `depthOccluder` geometry, alpha-keyed silhouettes
 *    included, blended geometry excluded. Every effect card, flame and
 *    waterfall is a hole in it, and so is the sky.
 *  - A hole is not zero motion. The target clears to (0,0,0,0) while Babylon
 *    writes velocity as `pow(|d|, 1/3) * sign(d) * 0.5 + 0.5`, so an unwritten
 *    pixel decodes to a full screen of travel on both axes. Alpha is the only
 *    thing that separates the two: 1 where a mesh wrote, 0 where nothing did.
 *
 * Seam tokens combine, comma separated: `1` writes the target at whatever
 * ratio the G-buffer already runs at, `debug` adds the view, `full` forces the
 * G-buffer to full resolution (Enhanced runs it at 0.5 for the AO).
 */

const SHADER = 'motionVectorsDebug';
const VELOCITY_SAMPLER = 'velocitySampler';

/**
 * Saturation point of the debug view, in screens travelled per frame. A
 * camera pan moves a near surface about 0.003 of the screen, so anything
 * around 40 renders the whole field as black.
 */
const DEBUG_GAIN = 120;

type Seam = {
  readonly on: boolean;
  readonly debug: boolean;
  readonly full: boolean;
};

const OFF: Seam = { on: false, debug: false, full: false };

let seamCache: Seam | null = null;

function readSeam(): Seam {
  const raw = devQuery('velocity');

  if (!raw || raw === '0' || raw === 'off') return OFF;

  const tokens = raw.split(',');

  return {
    on: true,
    debug: tokens.includes('debug'),
    full: tokens.includes('full'),
  };
}

/** Read once: the director asks for the ratio on every tick. */
function seam(): Seam {
  if (seamCache === null) seamCache = readSeam();

  return seamCache;
}

/** Frame generation cannot be had without the target, so it asks for it too. */
export function velocityWanted(): boolean {
  return seam().on || frameGenWantsVelocity();
}

/** Whether the seam asks for the G-buffer at full resolution. */
export function velocityFullRes(): boolean {
  const s = seam();

  return s.on && s.full;
}

/**
 * Called by the AO the moment it holds the renderer and before it reads a
 * single texture off it: the setter disposes the whole multi-target and builds
 * a new one, so anything grabbed first would be a dangling reference. It also
 * sets `scene.needsPreviousWorldMatrices`, which is where the CPU cost lives.
 */
export function applyVelocityTarget(gbuffer: GeometryBufferRenderer): void {
  const wanted = velocityWanted();

  if (gbuffer.enableVelocity !== wanted) gbuffer.enableVelocity = wanted;
}

type Runtime = {
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  readonly pass: PostProcess;
};

let runtime: Runtime | null = null;

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D ${VELOCITY_SAMPLER};  // cube-root packed, alpha 1 where a mesh wrote
  uniform float gain;

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    vec4 packed = texture2D(${VELOCITY_SAMPLER}, vUV);

    // Nothing wrote here. Showing the scene dimmed rather than a flat colour
    // keeps the holes readable as holes instead of as still geometry.
    if (packed.a < 0.5) {
      gl_FragColor = vec4(color.rgb * 0.12, color.a);
      return;
    }

    // The odd power carries the sign, so this is the packing undone.
    vec2 d = packed.rg * 2.0 - 1.0;
    vec2 v = d * d * d;

    float m = clamp(length(v) * gain, 0.0, 1.0);
    float hue = atan(v.y, v.x) * 0.15915494 + 0.5;
    vec3 wheel = clamp(
      abs(fract(hue + vec3(0.0, 0.66666, 0.33333)) * 6.0 - 3.0) - 1.0,
      0.0,
      1.0
    );

    gl_FragColor = vec4(mix(vec3(0.04), wheel, m), color.a);
  }
  `;
}

function createPass(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerShader();

  const pass = new PostProcess(
    'motionVectorsDebug',
    SHADER,
    ['gain'],
    [VELOCITY_SAMPLER],
    1,
    null,
    Texture.NEAREST_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  pass.onApply = effect => {
    const gbuffer = scene.geometryBufferRenderer;
    if (!gbuffer) return;

    const index = gbuffer.getTextureIndex(
      GeometryBufferRenderer.VELOCITY_TEXTURE_TYPE
    );
    const texture = gbuffer.getGBuffer().textures[index];
    if (!texture) return;

    effect.setTexture(VELOCITY_SAMPLER, texture);
    effect.setFloat('gain', DEBUG_GAIN);
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeMotionVectors(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

/**
 * Built while the seam asks for the view and the AO left a G-buffer to read.
 * Returns true when the chain changed. `upstreamChanged` re-attaches the pass
 * so it stays last: the view is not a look, and the tone pass would regrade it.
 */
export function syncMotionVectors(
  scene: Scene,
  camera: ArcRotateCamera,
  shaped: boolean,
  upstreamChanged: boolean
): boolean {
  const s = seam();
  const wanted =
    s.on && s.debug && shaped && scene.geometryBufferRenderer !== null;

  if (runtime && (!wanted || runtime.scene !== scene)) {
    disposeMotionVectors();
    if (!wanted) return true;
  }

  if (runtime && upstreamChanged) {
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);

    return true;
  }

  if (!wanted || runtime) return false;

  runtime = { scene, camera, pass: createPass(scene, camera) };

  return true;
}

export function motionVectorsLive(): boolean {
  return runtime !== null;
}
