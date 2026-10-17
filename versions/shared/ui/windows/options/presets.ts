import {
  GameOptions,
  defaultGameOption,
  setGameOption,
  type GameOptions as GameOptionsType,
} from '@/controllers/settings';
import { LIGHTING_QUALITY_LABEL_KEYS } from '@/controllers/lighting/lightingQuality';
import { RENDER_SCALE_STEPS } from '@/controllers/render/renderScale';
import type { TextKey } from '@/i18n';

/**
 * One click per tier: both quality tiers plus the Image group at the §6
 * defaults. Classic ignores the tone mapper and bloom (no image-processing
 * pass, no bloom on tier 0), so its row keeps the shared defaults rather
 * than zeros that would follow the player up to Enhanced. The Rendering
 * checks are left alone: they are the player's own costs, not part of a look,
 * and so is the rendering style.
 *
 * Low in front of them (ours) is the exception: for the machines the game
 * struggles on it turns off everything that can be turned off, the Rendering
 * checks and the crowd options included. Leaving it gives those their defaults back.
 */
export type TierPreset = Partial<GameOptionsType>;

const IMAGE_DEFAULTS = {
  toneMapper: 1,
  brightness: 0,
  bloom: 3,
  glow: 5,
  sharpness: 2,
  filmGrain: 0,
  chromatic: 0,
  vignette: 0,
  fxaa: false,
} as const;

const LOW: TierPreset = {
  ...IMAGE_DEFAULTS,
  lightingQuality: 0,
  materialQuality: 0,
  materialDetail: 0,
  bloom: 0,
  glow: 0,
  sharpness: 0,
  sunShafts: 0,
  postProcessing: false,
  shadows: false,
  dynamicLights: false,
  msaa: 0,
  anisotropy: 0,
  renderScale: RENDER_SCALE_STEPS.indexOf(0.75),
  renderDistance: 0,
  grassDensity: 0,
  clouds: false,
  weatherEffects: false,
  ambientParticles: false,
  animatedWater: false,
  advancedEffects: false,
  effectLevel: 0,
  itemEffects: 1,
  monsterEffects: false,
  otherSkillEffects: false,
  otherGearEffects: false,
  otherPets: false,
  otherPlayerAnimations: false,
  npcAnimations: false,
};

export const TIER_PRESETS: readonly TierPreset[] = [
  LOW,
  { ...IMAGE_DEFAULTS, lightingQuality: 0, materialQuality: 0, materialDetail: 6 },
  { ...IMAGE_DEFAULTS, lightingQuality: 1, materialQuality: 1, materialDetail: 6 },
  { ...IMAGE_DEFAULTS, lightingQuality: 2, materialQuality: 2, materialDetail: 6 },
];

/** Low, then the tier names. */
export const TIER_PRESET_LABEL_KEYS: readonly TextKey[] = [
  'options.quality.low',
  ...LIGHTING_QUALITY_LABEL_KEYS,
];

const keysOf = (preset: TierPreset) => Object.keys(preset) as (keyof GameOptionsType)[];

/** What only Low touches. */
const LOW_ONLY = keysOf(LOW).filter(key => !(key in TIER_PRESETS[1]));

export function applyTierPreset(preset: TierPreset): void {
  // Ours: also after a tweak made Low read as Custom; what the player changed since is kept.
  if (preset !== LOW && (activeTierPreset() === 0 || GameOptions.lowPresetApplied)) {
    for (const key of LOW_ONLY) {
      if (GameOptions[key] === LOW[key]) setGameOption(key, defaultGameOption(key) as never);
    }
  }
  for (const key of keysOf(preset)) setGameOption(key, preset[key] as never);
  setGameOption('lowPresetApplied', preset === LOW);
}

/** Index of the preset every stored value matches, -1 while none does. */
export function activeTierPreset(): number {
  return TIER_PRESETS.findIndex(preset =>
    keysOf(preset).every(key => GameOptions[key] === preset[key])
  );
}
