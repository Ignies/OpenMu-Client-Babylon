import {
  Effect,
  PostProcess,
  type Camera,
  type Scene,
} from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import { linearBufferActive } from '../common/lightModel';

export type MapGradient = {
  readonly top: readonly [number, number, number];
  readonly mid: readonly [number, number, number];
  readonly bottom: readonly [number, number, number];
};

const ENVELOPE = {
  edge: 0.5,
  topDark: 0.6,
  bottomDark: 0.45,
  glowY: 0.46,
  glowWidth: 0.3,
  glowAmount: 0.6,
  saturation: 0.6,
  lift: 0.34,
  liftRange: 0.45,
  hueGain: 2.2,
};

export const MAP_GRADIENTS: Partial<Record<ENUM_WORLD, MapGradient>> = {
  [ENUM_WORLD.WD_0LORENCIA]: {
    top: [1.12, 0.98, 0.78],
    mid: [1.08, 0.99, 0.84],
    bottom: [1.04, 0.97, 0.82],
  },
  [ENUM_WORLD.WD_1DUNGEON]: {
    top: [0.9, 0.96, 1.0],
    mid: [0.98, 0.98, 0.98],
    bottom: [1.06, 0.98, 0.88],
  },
  [ENUM_WORLD.WD_2DEVIAS]: {
    top: [0.86, 0.95, 1.12],
    mid: [0.92, 0.98, 1.08],
    bottom: [0.95, 1.0, 1.05],
  },
  [ENUM_WORLD.WD_3NORIA]: {
    top: [1.04, 1.03, 0.88],
    mid: [0.98, 1.04, 0.94],
    bottom: [1.03, 0.98, 0.99],
  },
  [ENUM_WORLD.WD_4LOSTTOWER]: {
    top: [0.96, 0.92, 1.1],
    mid: [0.98, 0.95, 1.07],
    bottom: [1.0, 0.97, 1.03],
  },
  [ENUM_WORLD.WD_6STADIUM]: {
    top: [1.04, 1.0, 0.92],
    mid: [1.02, 1.0, 0.96],
    bottom: [1.0, 1.0, 0.98],
  },
  [ENUM_WORLD.WD_7ATLANSE]: {
    top: [0.78, 1.02, 1.16],
    mid: [0.82, 1.04, 1.12],
    bottom: [0.88, 1.06, 1.04],
  },
  [ENUM_WORLD.WD_8TARKAN]: {
    top: [1.08, 1.01, 0.9],
    mid: [1.12, 1.0, 0.84],
    bottom: [1.16, 0.98, 0.78],
  },
  [ENUM_WORLD.WD_9DEVILSQUARE]: {
    top: [1.12, 0.9, 0.9],
    mid: [1.14, 0.92, 0.88],
    bottom: [1.1, 0.94, 0.92],
  },
  [ENUM_WORLD.WD_10ICARUS]: {
    top: [0.94, 0.99, 1.1],
    mid: [0.97, 1.0, 1.06],
    bottom: [1.0, 1.0, 1.02],
  },
  [ENUM_WORLD.WD_11BLOODCASTLE1]: {
    top: [1.14, 0.88, 0.86],
    mid: [1.12, 0.92, 0.9],
    bottom: [1.08, 0.95, 0.94],
  },
  [ENUM_WORLD.WD_18CHAOS_CASTLE]: {
    top: [1.04, 0.9, 1.12],
    mid: [1.02, 0.93, 1.09],
    bottom: [1.0, 0.96, 1.05],
  },
  [ENUM_WORLD.WD_24HELLAS]: {
    top: [1.16, 0.94, 0.8],
    mid: [1.14, 0.95, 0.84],
    bottom: [1.08, 0.96, 0.9],
  },
  [ENUM_WORLD.WD_30BATTLECASTLE]: {
    top: [0.98, 0.99, 1.04],
    mid: [1.0, 1.0, 1.01],
    bottom: [1.02, 1.0, 0.98],
  },
  [ENUM_WORLD.WD_31HUNTING_GROUND]: {
    top: [1.02, 1.02, 0.9],
    mid: [0.97, 1.04, 0.95],
    bottom: [0.98, 1.02, 0.96],
  },
  [ENUM_WORLD.WD_33AIDA]: {
    top: [0.9, 1.04, 1.04],
    mid: [0.93, 1.04, 1.02],
    bottom: [0.97, 1.02, 1.0],
  },
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: {
    top: [0.92, 0.95, 1.1],
    mid: [0.98, 0.97, 1.04],
    bottom: [1.06, 0.98, 0.94],
  },
  [ENUM_WORLD.WD_35CRYWOLF_2ND]: {
    top: [0.92, 0.95, 1.1],
    mid: [0.98, 0.97, 1.04],
    bottom: [1.06, 0.98, 0.94],
  },
  [ENUM_WORLD.WD_37KANTURU_1ST]: {
    top: [0.94, 0.98, 1.08],
    mid: [0.97, 0.99, 1.05],
    bottom: [1.0, 1.0, 1.02],
  },
  [ENUM_WORLD.WD_38KANTURU_2ND]: {
    top: [0.94, 0.98, 1.08],
    mid: [0.97, 0.99, 1.05],
    bottom: [1.0, 1.0, 1.02],
  },
  [ENUM_WORLD.WD_39KANTURU_3RD]: {
    top: [0.9, 0.97, 1.12],
    mid: [0.94, 0.98, 1.08],
    bottom: [0.98, 1.0, 1.04],
  },
  [ENUM_WORLD.WD_51ELBELAND]: {
    top: [0.96, 1.06, 0.98],
    mid: [0.94, 1.06, 1.0],
    bottom: [0.97, 1.04, 0.99],
  },
  [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: {
    top: [0.94, 1.02, 0.94],
    mid: [0.96, 1.05, 0.92],
    bottom: [0.98, 1.04, 0.9],
  },
  [ENUM_WORLD.WD_57ICECITY]: {
    top: [0.84, 0.96, 1.16],
    mid: [0.88, 0.98, 1.12],
    bottom: [0.93, 1.0, 1.07],
  },
  [ENUM_WORLD.WD_58ICECITY_BOSS]: {
    top: [0.82, 0.95, 1.18],
    mid: [0.86, 0.97, 1.14],
    bottom: [0.92, 0.99, 1.08],
  },
  [ENUM_WORLD.WD_62SANTA_TOWN]: {
    top: [0.9, 0.97, 1.1],
    mid: [0.98, 0.99, 1.04],
    bottom: [1.06, 0.99, 0.95],
  },
  [ENUM_WORLD.WD_80KARUTAN1]: {
    top: [1.06, 1.02, 0.88],
    mid: [1.1, 1.02, 0.84],
    bottom: [1.12, 1.0, 0.82],
  },
  [ENUM_WORLD.WD_81KARUTAN2]: {
    top: [1.06, 1.02, 0.88],
    mid: [1.1, 1.02, 0.84],
    bottom: [1.12, 1.0, 0.82],
  },
  [ENUM_WORLD.WD_72EMPIREGUARDIAN4]: {
    top: [0.9, 0.95, 1.08],
    mid: [1.0, 0.98, 0.98],
    bottom: [1.1, 0.98, 0.86],
  },
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: {
    top: [0.9, 0.95, 1.08],
    mid: [1.0, 0.98, 0.98],
    bottom: [1.1, 0.98, 0.86],
  },
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: {
    top: [0.88, 0.94, 1.12],
    mid: [0.96, 0.97, 1.04],
    bottom: [1.08, 0.98, 0.9],
  },
};

const DEFAULT_GLOW: readonly [number, number, number] = [1.2, 1.0, 0.72];

const MAP_GLOW: Partial<Record<ENUM_WORLD, readonly [number, number, number]>> =
  {
    [ENUM_WORLD.WD_2DEVIAS]: [0.86, 0.98, 1.22],
    [ENUM_WORLD.WD_7ATLANSE]: [0.72, 1.06, 1.2],
    [ENUM_WORLD.WD_10ICARUS]: [0.94, 1.02, 1.2],
    [ENUM_WORLD.WD_18CHAOS_CASTLE]: [1.1, 0.86, 1.2],
    [ENUM_WORLD.WD_33AIDA]: [0.84, 1.1, 1.06],
    [ENUM_WORLD.WD_39KANTURU_3RD]: [0.86, 0.98, 1.2],
    [ENUM_WORLD.WD_51ELBELAND]: [0.92, 1.12, 0.94],
    [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: [0.94, 1.12, 0.86],
    [ENUM_WORLD.WD_57ICECITY]: [0.82, 0.96, 1.24],
    [ENUM_WORLD.WD_58ICECITY_BOSS]: [0.8, 0.95, 1.26],
    [ENUM_WORLD.WD_4LOSTTOWER]: [0.98, 0.94, 1.18],
    [ENUM_WORLD.WD_37KANTURU_1ST]: [0.92, 0.98, 1.14],
    [ENUM_WORLD.WD_38KANTURU_2ND]: [0.92, 0.98, 1.14],
    [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: [0.9, 0.96, 1.18],
  };

const NEUTRAL_GRADIENT: MapGradient = {
  top: [1, 1, 1],
  mid: [1, 1, 1],
  bottom: [1, 1, 1],
};

const SHADER_NAME = 'muMapGradient';

function normalise(
  rgb: readonly [number, number, number]
): [number, number, number] {
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

  if (luma <= 0.0001) return [1, 1, 1];

  return [rgb[0] / luma, rgb[1] / luma, rgb[2] / luma];
}

Effect.ShadersStore[`${SHADER_NAME}FragmentShader`] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;

  uniform vec3 gradTop;
  uniform vec3 gradMid;
  uniform vec3 gradBottom;
  uniform vec3 glowColor;
  uniform vec4 envelope;
  uniform vec3 glowShape;
  uniform vec3 shadowLift;
  uniform float strength;

  // The grade was authored against the old buffer, which the same content
  // now reaches at 1/exposure of the old value (the unified light model;
  // sceneLook). The luma knees and the additive shadow lift only make sense
  // in that domain - on the raw linear buffer "dark" covers nearly the
  // whole frame and the lift becomes a full-frame veil - so the pass scales
  // in, works in old-buffer terms, and scales back out. 1 outside the model.
  uniform float gradExposure;

  // The day/night cycle's full-frame grade (identity at noon / cycle off).
  // Lives here and not in the light tints because a blue *light* on brown
  // ground multiplies to olive - night has to grade the air, like the
  // reference does.
  uniform vec3 phaseTint;

  // Resaturation after the phase tint (sceneLook sceneSat): a tint multiply
  // can only remove colour - cool light on warm ground cancels into grey -
  // so the dark phases pull their richness back here. 1 = untouched.
  uniform float phaseSat;

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  void main(void) {
    vec4 scene = texture2D(textureSampler, vUV);
    vec3 col = scene.rgb * gradExposure;

    vec3 tint = vUV.y > 0.5
      ? mix(gradMid, gradTop, (vUV.y - 0.5) * 2.0)
      : mix(gradBottom, gradMid, vUV.y * 2.0);

    tint = vec3(1.0) + (tint - vec3(1.0)) * shadowLift.z;

    col *= mix(vec3(1.0), tint, strength);

    float luma = dot(col, LUMA);
    float darkness = 1.0 - smoothstep(0.0, shadowLift.y, luma);

    col += tint * darkness * shadowLift.x * strength;

    float top = smoothstep(envelope.x, 1.0, vUV.y);
    float bottom = smoothstep(envelope.x, 1.0, 1.0 - vUV.y);

    float band = exp(
      -((vUV.y - glowShape.x) * (vUV.y - glowShape.x)) /
      (2.0 * glowShape.y * glowShape.y)
    );

    float shape =
      1.0
      - top * envelope.y
      - bottom * envelope.z
      + band * glowShape.z;

    col *= mix(1.0, max(shape, 0.0), strength);

    col *= mix(vec3(1.0), glowColor, band * glowShape.z * strength * 0.5);

    float gray = dot(col, LUMA);
    col = mix(vec3(gray), col, 1.0 + envelope.w * strength);

    col *= phaseTint;
    col = mix(vec3(dot(col, LUMA)), col, phaseSat);

gl_FragColor = vec4(max(col, 0.0) / gradExposure, scene.a);
  }
`;

let pass: PostProcess | null = null;
let passCamera: Camera | null = null;
let passScene: Scene | null = null;
let attached = false;

let current: MapGradient = NEUTRAL_GRADIENT;
let currentGlow: readonly [number, number, number] = DEFAULT_GLOW;
let currentStrength = 0;
let currentExposure = 1;
/** The day/night cycle's full-frame grade (sceneLook `sceneTint`). */
const currentPhaseTint: [number, number, number] = [1, 1, 1];
let currentPhaseSat = 1;

export function createMapGradient(scene: Scene, camera: Camera): void {
  if (pass) return;

  passCamera = camera;
  passScene = scene;

  pass = new PostProcess(
    SHADER_NAME,
    SHADER_NAME,
    [
      'gradTop',
      'gradMid',
      'gradBottom',
      'glowColor',
      'envelope',
      'glowShape',
      'shadowLift',
      'strength',
      'gradExposure',
      'phaseTint',
      'phaseSat',
    ],
    null,
    1,
    null,
    undefined,
    scene.getEngine()
  );

  pass.onApply = effect => {
    const top = normalise(current.top);
    const mid = normalise(current.mid);
    const bottom = normalise(current.bottom);
    const glow = normalise(currentGlow);

    effect.setFloat3('gradTop', top[0], top[1], top[2]);
    effect.setFloat3('gradMid', mid[0], mid[1], mid[2]);
    effect.setFloat3('gradBottom', bottom[0], bottom[1], bottom[2]);
    effect.setFloat3('glowColor', glow[0], glow[1], glow[2]);

    effect.setFloat4(
      'envelope',
      ENVELOPE.edge,
      ENVELOPE.topDark,
      ENVELOPE.bottomDark,
      ENVELOPE.saturation
    );

    effect.setFloat3(
      'glowShape',
      ENVELOPE.glowY,
      ENVELOPE.glowWidth,
      ENVELOPE.glowAmount
    );

    effect.setFloat3(
      'shadowLift',
      ENVELOPE.lift,
      ENVELOPE.liftRange,
      ENVELOPE.hueGain
    );

    effect.setFloat('strength', currentStrength);
    effect.setFloat(
      'gradExposure',
      passScene && linearBufferActive(passScene) ? currentExposure : 1
    );
    effect.setFloat3('phaseTint', ...currentPhaseTint);
    effect.setFloat('phaseSat', currentPhaseSat);
  };
}

function setAttached(next: boolean): void {
  if (!pass || !passCamera || next === attached) return;

  attached = next;

  if (next) passCamera.attachPostProcess(pass);
  else passCamera.detachPostProcess(pass);
}

export function applyMapGradient(
  world: ENUM_WORLD,
  strength: number,
  moodExposure = 1,
  phaseTint?: readonly [number, number, number],
  phaseSat = 1
): void {
  const gradient = MAP_GRADIENTS[world];

  current = gradient ?? NEUTRAL_GRADIENT;
  currentGlow = MAP_GLOW[world] ?? DEFAULT_GLOW;
  currentStrength = Math.max(0, strength);
  currentExposure = Math.max(moodExposure, 0.01);
  currentPhaseTint[0] = phaseTint?.[0] ?? 1;
  currentPhaseTint[1] = phaseTint?.[1] ?? 1;
  currentPhaseTint[2] = phaseTint?.[2] ?? 1;
  currentPhaseSat = Math.max(0, phaseSat);

  const tinted =
    currentPhaseTint[0] !== 1 ||
    currentPhaseTint[1] !== 1 ||
    currentPhaseTint[2] !== 1 ||
    currentPhaseSat !== 1;

  setAttached((gradient !== undefined && currentStrength > 0) || tinted);
}
