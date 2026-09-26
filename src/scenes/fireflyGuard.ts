import {
  Constants,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQueryNumber, devQueryNumbers } from '../common/devSeams';
import {
  MSAA_HEAD_ONLY,
  pipelineSamples,
  sceneTargetSamples,
} from '../common/lightingQuality';
import { BLOOM_THRESHOLD } from './postChain';

/**
 * The firefly guard: sole owner of the pass that bounds what one pixel may
 * hand the bloom blur. Runs on the linear buffer ahead of the rendering
 * pipeline, so `scenes/postChain.ts` keeps its bloom exactly as it is.
 *
 * Why it exists. Bloom spreads a pixel over a 48 px kernel, so how far it
 * reaches is set by the pixel's *value* and not by the size of the thing that
 * made it. One aliased fragment can therefore be drawn as a pool of light
 * that nothing in the scene is emitting. The case this was written for is a
 * grass blade at the far zoom
 * (issues/lighting/grass_tips_bloom_into_floating_lights.md): a blade's
 * albedo goes over 1, the decode squares it, and a single fragment arrives at
 * the bloom pass carrying 32 while the hottest torch pixel in the same frame
 * carries under 4. Zoomed in, hundreds of fragments are in that state at once
 * and read as sunlit grass; zoomed out a blade is sub-pixel, a handful are
 * left, and each one is drawn as its own ball that flickers with the wind.
 *
 * No threshold can separate those two - the artefact is the *brighter* of
 * them - so this bounds instead: a pixel may exceed the bloom threshold on
 * its own, but to go further than SPREAD over its brightest neighbour it has
 * to be part of something. A lone spike sits on ordinary grass and comes
 * down; a torch core, a flare or an emissive card is bright over an area, so
 * every pixel in it has a bright neighbour and none of them move.
 *
 * Off when the MU curve is live (`toneMapper` 1): that one rolls the whole
 * buffer into [0, 1] before the pipeline, so no pixel can hand the blur more
 * than one unit and the artefact cannot happen - which is why the report only
 * ever came from the other three mappers. Off with bloom off, and off on
 * Classic, which has no bloom at all.
 */

const SHADER = 'muFireflyGuard';

/**
 * How far over its brightest neighbour a pixel may sit before it is treated
 * as a spike rather than as light.
 *
 * The balls die at every value from 2 to 32, because what catches them is
 * the floor below, not this: an aliased blade tip at the far zoom sits on
 * grass that is nearly black, so `neighbour x SPREAD` never reaches the floor
 * whatever SPREAD is. This number is therefore chosen for what it *protects* -
 * the larger it is the more of a real gradient survives - and 4 is as far as
 * it can go while still being under any one-pixel step a flame, a flare or a
 * lit edge actually makes.
 */
const SPREAD = 4;

/**
 * What a lone pixel may carry regardless of its neighbours, so a real point
 * emitter against black - a spark, a distant lamp - is not clamped to the
 * darkness around it.
 *
 * Set at the ceiling of what is actually in the frame rather than at the
 * bloom threshold: sweeping the buffer this pass reads, the hottest *torch*
 * pixel at the graveyard sits under 4 while the aliased blade tips reach 32,
 * so four times the threshold is above everything real and a decade under the
 * artefact. It has to be up here and not at the threshold itself, because at
 * the near zoom hundreds of grass fragments are legitimately over the
 * threshold at once: at the threshold the guard takes a little of their bloom
 * with it (the 500x350 grass crop's p05 fell 0.071 -> 0.062), and at four
 * times it the same crop is the control to three decimals.
 */
const FLOOR = BLOOM_THRESHOLD * 4;

const knobsDev = devQueryNumbers('fireflyk', 2);
const guardDev = devQueryNumber('firefly');

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 texel;
  uniform vec2 guard;  // spread, floor

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  float lumaAt(vec2 uv) {
    return dot(max(texture2D(textureSampler, uv).rgb, vec3(0.0)), LUMA);
  }

  void main(void) {
    vec4 src = texture2D(textureSampler, vUV);
    vec3 c = max(src.rgb, vec3(0.0));

    float lum = dot(c, LUMA);

    // The cross and not the full ring: a spike is one fragment, so four taps
    // find it, and the corners would cost half as much again on a
    // full-resolution pass for nothing.
    float near = max(
      max(lumaAt(vUV + vec2(texel.x, 0.0)), lumaAt(vUV - vec2(texel.x, 0.0))),
      max(lumaAt(vUV + vec2(0.0, texel.y)), lumaAt(vUV - vec2(0.0, texel.y))));

    float cap = max(near * guard.x, guard.y);

    // Scale, never replace: the chroma rides the luminance down, so a clamped
    // pixel keeps the colour it had.
    gl_FragColor = vec4(c * min(1.0, cap / max(lum, 1e-4)), src.a);
  }
  `;
}

function createPass(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerShader();

  const pass = new PostProcess(
    SHADER,
    SHADER,
    ['texel', 'guard'],
    [],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  // The chain's own sample count, for the frames where nothing else is
  // attached ahead of the pipeline: the scene renders into the first pass's
  // target, so that pass is the one that has to be multisampled.
  if (!MSAA_HEAD_ONLY) pass.samples = pipelineSamples();

  const [spread, floor] = knobsDev ?? [SPREAD, FLOOR];

  pass.onApply = effect => {
    effect.setFloat2('texel', pass.texelSize.x, pass.texelSize.y);
    effect.setFloat2('guard', spread, floor);
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeFireflyGuard(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

/**
 * Live while the caller wants it. Returns true when the chain changed, like
 * the tone curve: the post chain has to be re-attached behind a new pass.
 *
 * Dev seams: `?firefly=0` forces it off, `?fireflyk=spread,floor` replaces
 * the two numbers.
 */
export function syncFireflyGuard(
  scene: Scene,
  camera: ArcRotateCamera,
  want: boolean,
  /** A pass ahead of it was rebuilt this tick: re-attach behind it, no rebuild. */
  upstreamChanged: boolean
): boolean {
  const live = want && guardDev !== 0;

  if (runtime && (!live || runtime.scene !== scene)) {
    disposeFireflyGuard();
    if (!live) return true;
  }

  if (runtime && !MSAA_HEAD_ONLY) {
    // The MSAA option moves without this pass being rebuilt, and it is often
    // the first one attached (see `createPass`).
    const samples = pipelineSamples();

    if (runtime.pass.samples !== samples) runtime.pass.samples = samples;
  }

  if (runtime && upstreamChanged) {
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);
    return true;
  }

  if (!live || runtime) return false;

  runtime = { scene, camera, pass: createPass(scene, camera) };

  return true;
}

/**
 * The pass's MSAA, only while the scene is drawn into it. Called once the
 * camera's chain is final.
 */
export function syncFireflyGuardSamples(): void {
  if (!runtime || !MSAA_HEAD_ONLY) return;

  const samples = sceneTargetSamples(runtime.camera, runtime.pass);

  if (runtime.pass.samples !== samples) runtime.pass.samples = samples;
}
