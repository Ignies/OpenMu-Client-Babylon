import {
  ColorCurves,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { pipelineSamples } from '../common/lightingQuality';
import type { Rgb } from '../lighting/profiles';

/**
 * The post chain (ARCHITECTURE §4.8): sole writer of the
 * `DefaultRenderingPipeline` and of `scene.imageProcessingConfiguration`.
 *
 * bloom -> exposure -> tone mapper -> white balance -> decoration -> FXAA.
 * SSAO and the haze run ahead of it in their own owners; `moveToEnd` keeps
 * this pipeline last after they rebuild.
 *
 * The image-processing *values* are written on every call, neutral when a
 * pass is off: the configuration is the scene's, and the PBR material
 * composes image processing in its own fragment whenever the pass is not
 * doing it, so a stale value would move onto the materials instead of
 * disappearing.
 */

/** What the post chain needs from the look; the director hands it over. */
export type PostLook = {
  /** Enhanced/Ultra: the grade runs. Classic: exposure 1, no curve. */
  readonly shaped: boolean;
  /** Linear exposure multiplier, `2^ev`. */
  readonly exposure: number;
  /** 0 none / 1 standard / 2 aces / 3 neutral. */
  readonly toneMapper: number;
  readonly whiteBalance: Rgb;
};

const SLIDER_MAX = 9;

const SHARPEN_MAX_EDGE_AMOUNT = 0.4;

const GRAIN_INTENSITY = 4;

/** Chromatic aberration at the top slider notch. */
const CHROMATIC_MAX = 12;

/** Multiply vignette weight at the top slider notch. */
const VIGNETTE_MAX_WEIGHT = 1.2;

/**
 * Bloom picks up only what exceeds scene white in the linear buffer: the
 * key is normalised so an up-facing surface takes 1.0, so nothing lit by it
 * blooms and emitters and torch cores do.
 */
const BLOOM_THRESHOLD = 1.0;
const BLOOM_KERNEL = 48;
const BLOOM_MAX_WEIGHT = 0.6;

const TONE_MAPPING_TYPES: readonly number[] = [
  ImageProcessingConfiguration.TONEMAPPING_STANDARD,
  ImageProcessingConfiguration.TONEMAPPING_STANDARD,
  ImageProcessingConfiguration.TONEMAPPING_ACES,
  ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL,
];

export const TONE_MAPPER_NAMES = ['none', 'standard', 'aces', 'neutral'] as const;

export type ToneMapperName = (typeof TONE_MAPPER_NAMES)[number];

const PIPELINE_NAME = 'postChain';

/**
 * A per-channel multiplier as Babylon colour curves. The curves' global term
 * is `2 x HSB(hue, s, v)` with the slider values squared, so any multiplier
 * whose peak channel is at least 1 has an exact (hue, density, exposure)
 * triple; the balance is normalised to unit Rec709 luma first so it moves
 * tint and never level. Returns false for a neutral balance.
 */
function whiteBalanceToCurves(curves: ColorCurves, wb: Rgb): boolean {
  const luma = 0.2126 * wb[0] + 0.7152 * wb[1] + 0.0722 * wb[2];
  const r = wb[0] / luma;
  const g = wb[1] / luma;
  const b = wb[2] / luma;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max - min < 1e-4) return false;

  const exposure = 100 * Math.sqrt(Math.max(0, (max - 1) / 0.5));
  const density = Math.min(100, 100 * Math.sqrt(2 * (1 - min / max)));

  const d = max - min;
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;

  curves.globalHue = hue;
  curves.globalDensity = density;
  curves.globalExposure = exposure;
  curves.globalSaturation = 0;

  return true;
}

export type PostChain = {
  readonly pipeline: DefaultRenderingPipeline;
  set(look: PostLook): void;
  /** Re-attach behind whatever else was attached to the camera since. */
  moveToEnd(): void;
  /** Names of the passes live right now, in chain order. */
  passes(): string[];
};

export function createPostChain(
  scene: Scene,
  camera: ArcRotateCamera
): PostChain {
  const pipeline = new DefaultRenderingPipeline(PIPELINE_NAME, true, scene, [
    camera,
  ]);

  // Every pass is driven by an option in `set`; the pipeline starts with all
  // of them off so nothing runs that no slider asked for.
  pipeline.fxaaEnabled = false;
  pipeline.samples = pipelineSamples();
  pipeline.bloomEnabled = false;
  pipeline.bloomScale = 0.5;
  pipeline.bloomKernel = BLOOM_KERNEL;
  pipeline.chromaticAberrationEnabled = false;
  pipeline.imageProcessingEnabled = false;
  pipeline.sharpen.colorAmount = 1;
  pipeline.grain.animated = true;

  const curves = new ColorCurves();

  const live: string[] = [];

  const set = (look: PostLook): void => {
    const post = GameOptions.postProcessing;
    const shaped = look.shaped;

    live.length = 0;

    pipeline.samples = pipelineSamples();

    // Bloom samples the linear buffer before exposure. Off on Classic (§6).
    const bloom = post && shaped ? Math.max(0, GameOptions.bloom) : 0;

    pipeline.bloomEnabled = bloom > 0;
    pipeline.bloomThreshold = BLOOM_THRESHOLD;
    pipeline.bloomWeight = (bloom / SLIDER_MAX) * BLOOM_MAX_WEIGHT;
    pipeline.bloomKernel = BLOOM_KERNEL;
    if (bloom > 0) live.push('bloom');

    // With post off the image-processing *pass* is bypassed outright rather
    // than left running with neutral values: an identity pass is still a
    // full-screen resolve.
    pipeline.imageProcessingEnabled = post;

    const ip = scene.imageProcessingConfiguration;

    const exposure = shaped ? look.exposure : 1;
    ip.exposure = exposure;
    if (post && exposure !== 1) live.push('exposure');

    const toneMapper = shaped && post ? look.toneMapper : 0;
    ip.toneMappingEnabled = toneMapper > 0;
    ip.toneMappingType = TONE_MAPPING_TYPES[toneMapper];
    if (toneMapper > 0) live.push(`toneMapper:${TONE_MAPPER_NAMES[toneMapper]}`);

    ip.contrast = 1;

    const balanced = shaped && post && whiteBalanceToCurves(curves, look.whiteBalance);
    ip.colorCurves = curves;
    ip.colorCurvesEnabled = balanced;
    if (balanced) live.push('whiteBalance');

    const vignette = post ? Math.max(0, GameOptions.vignette) : 0;
    ip.vignetteEnabled = vignette > 0;
    ip.vignetteWeight = (vignette / SLIDER_MAX) * VIGNETTE_MAX_WEIGHT;
    ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    ip.vignetteColor.set(0, 0, 0, 0);
    // The live fov: the camera runs at 30 deg while the pipeline's default
    // is 0.8 rad, and the falloff is computed against it.
    ip.vignetteCameraFov = camera.fov;
    if (vignette > 0) live.push('vignette');

    const sharpness = post ? Math.max(0, GameOptions.sharpness) : 0;
    pipeline.sharpenEnabled = sharpness > 0;
    pipeline.sharpen.edgeAmount = (sharpness / SLIDER_MAX) * SHARPEN_MAX_EDGE_AMOUNT;
    if (sharpness > 0) live.push('sharpen');

    const grain = post ? Math.max(0, GameOptions.filmGrain) : 0;
    pipeline.grainEnabled = grain > 0;
    pipeline.grain.intensity = (grain / SLIDER_MAX) * GRAIN_INTENSITY;
    if (grain > 0) live.push('grain');

    const chromatic = post ? Math.max(0, GameOptions.chromatic) : 0;
    pipeline.chromaticAberrationEnabled = chromatic > 0;
    pipeline.chromaticAberration.aberrationAmount =
      (chromatic / SLIDER_MAX) * CHROMATIC_MAX;
    if (chromatic > 0) live.push('chromatic');

    pipeline.fxaaEnabled = post && GameOptions.fxaa;
    if (pipeline.fxaaEnabled) live.push('fxaa');
  };

  const moveToEnd = (): void => {
    const manager = scene.postProcessRenderPipelineManager;

    if (manager.supportedPipelines.some(p => p.name === PIPELINE_NAME)) {
      manager.detachCamerasFromRenderPipeline(PIPELINE_NAME, camera);
      manager.attachCamerasToRenderPipeline(PIPELINE_NAME, camera);
    }
  };

  return { pipeline, set, moveToEnd, passes: () => [...live] };
}
