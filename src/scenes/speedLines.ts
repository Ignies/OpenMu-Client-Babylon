import {
  Constants,
  PostProcess,
  ShaderStore,
  Texture,
  Vector3,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import type { LightingTier } from '../common/lightingQuality';
import { speedLineStrength } from '../common/renderingStyle';

/**
 * Speed lines (rendering_style ARCHITECTURE 2.6): sole owner of the radial
 * streak pass, beside the ink lines.
 *
 * It owns the scalar it runs on as well, and that is the point of the
 * module. Anime draws speed lines when something is moving fast, and the
 * fastest thing on screen here is the hero - but reaching into the ECS from
 * the lighting stage to ask how fast the hero is running would put a seam
 * between two stages that have none. The camera follows the hero, so its own
 * travel says the same thing: the world position it sat at last frame
 * against the one it sits at now, over the engine's delta, smoothed so a
 * warp or a camera cut does not flash the screen.
 *
 * The streaks themselves are the textbook figure: an angle off the frame's
 * centre, quantised into cells so each cell is one streak, each cell's
 * length and brightness hashed off its index so they vary, and the whole
 * thing faded in from an inner radius so the middle of the screen - where
 * the hero is - stays clear.
 */

const SHADER = 'muSpeedLines';

/** Streaks around the full turn. */
const CELLS = 220;

/** Tiles per second at which the lines reach the slider's full strength. */
const FULL_SPEED = 6;

/** Seconds of smoothing on the camera's speed, and the ceiling a jump is cut at. */
const SMOOTHING = 0.25;
const JUMP_SPEED = 40;

/** Where the streaks start, as a share of the half diagonal, and where they end. */
const INNER = 0.35;
const OUTER = 1;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

const shown = { strength: 0 };

/** The camera's own travel, smoothed, in tiles per second. */
const travel = { speed: 0, at: new Vector3(), seen: false };

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 aspect;      // the frame's shape, so the streaks stay radial
  uniform float strength;   // 0 draws nothing

  float hash(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
  }

  void main(void) {
    vec2 d = (vUV - 0.5) * aspect;
    float r = clamp(length(d) / ${OUTER.toFixed(2)}, 0.0, 1.0);
    float a = atan(d.y, d.x);

    // One streak per angular cell, each with its own start and weight.
    float cell = floor((a + 3.1415927) * (${CELLS.toFixed(1)} / 6.2831853));
    float start = mix(${INNER.toFixed(2)}, 0.95, hash(cell));
    float thin = 0.35 + 0.65 * hash(cell + 17.0);

    float along = smoothstep(start, 1.0, r);
    // The cell's own width: a streak is a line, not a wedge.
    float across = 1.0 - smoothstep(0.0, thin, abs(fract((a + 3.1415927) * (${CELLS.toFixed(1)} / 6.2831853)) - 0.5) * 2.0);

    float line = along * across * (0.5 + 0.5 * hash(cell + 91.0)) * strength;

    vec4 color = texture2D(textureSampler, vUV);
    // Drawn as light, the way an anime speed line is inked on a light plate.
    gl_FragColor = vec4(color.rgb + vec3(line), color.a);
  }
`;
}

function createPass(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerShader();

  const pass = new PostProcess(
    SHADER,
    SHADER,
    ['aspect', 'strength'],
    [],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  pass.onApply = effect => {
    const engine = scene.getEngine();
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const long = Math.max(w, h);

    effect.setFloat2('aspect', w / long, h / long);
    effect.setFloat('strength', shown.strength);
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeSpeedLines(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

/**
 * Built while Anime 2.0 asks for the lines and post is on. Returns true when
 * the chain changed; `upstreamChanged` re-attaches behind a pass that was
 * rebuilt this tick.
 */
export function syncSpeedLines(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier | null,
  post: boolean,
  dt: number,
  upstreamChanged: boolean
): boolean {
  const slider = speedLineStrength();
  const wanted = tier !== null && post && slider > 0;

  if (wanted) {
    const at = camera.globalPosition;
    const step = travel.seen
      ? Vector3.Distance(at, travel.at) / Math.max(dt, 1e-3)
      : 0;

    travel.at.copyFrom(at);
    travel.seen = true;

    // A warp moves the camera a map's width in one frame; that is a cut, not
    // a run, so it is dropped rather than smoothed in.
    const raw = step > JUMP_SPEED ? 0 : step;
    const blend = Math.min(1, dt / SMOOTHING);

    travel.speed += (raw - travel.speed) * blend;
    shown.strength = slider * Math.min(1, travel.speed / FULL_SPEED);
  } else {
    shown.strength = 0;
    travel.seen = false;
    travel.speed = 0;
  }

  if (runtime && (!wanted || runtime.scene !== scene)) {
    disposeSpeedLines();
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

export function speedLinesLive(): boolean {
  return runtime !== null;
}
