import {
  GameOptions,
  setGameOption,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import { LIGHTING_QUALITY_LABEL_KEYS } from '../../../common/lightingQuality';
import type { TextKey } from '../../../i18n';

/**
 * One click per tier: both quality tiers plus the Image group at the §6
 * defaults. Classic ignores the tone mapper and bloom (no image-processing
 * pass, no bloom on tier 0), so its row keeps the shared defaults rather
 * than zeros that would follow the player up to Enhanced. The Rendering
 * checks are left alone: they are the player's own costs, not part of a look.
 */
export type TierPreset = Pick<
  GameOptionsType,
  | 'lightingQuality'
  | 'materialQuality'
  | 'materialDetail'
  | 'toneMapper'
  | 'brightness'
  | 'bloom'
  | 'glow'
  | 'sharpness'
  | 'filmGrain'
  | 'chromatic'
  | 'vignette'
  | 'fxaa'
>;

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

export const TIER_PRESETS: readonly TierPreset[] = [
  { ...IMAGE_DEFAULTS, lightingQuality: 0, materialQuality: 0, materialDetail: 6 },
  { ...IMAGE_DEFAULTS, lightingQuality: 1, materialQuality: 1, materialDetail: 6 },
  { ...IMAGE_DEFAULTS, lightingQuality: 2, materialQuality: 2, materialDetail: 6 },
];

/** The presets share the tier names. */
export const TIER_PRESET_LABEL_KEYS: readonly TextKey[] = LIGHTING_QUALITY_LABEL_KEYS;

const PRESET_KEYS = Object.keys(TIER_PRESETS[0]) as (keyof TierPreset)[];

export function applyTierPreset(preset: TierPreset): void {
  for (const key of PRESET_KEYS) setGameOption(key, preset[key]);
}

/** Index of the preset every stored value matches, -1 while none does. */
export function activeTierPreset(): number {
  return TIER_PRESETS.findIndex(preset =>
    PRESET_KEYS.every(key => GameOptions[key] === preset[key])
  );
}
