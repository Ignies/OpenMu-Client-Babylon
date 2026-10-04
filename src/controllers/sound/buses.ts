import { GameOptions } from '@/controllers/settings';

/**
 * The mixer's categories: pure data over `GameOptions` (master, the music / effects
 * tracks, one category per kind of sound under `effects`). Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Where a category slider stops, and where its gain is 1. */
export const BUS_VOLUME_MAX = 10;

/**
 * `world` is the default: a map door, a firework, a meteor - a sound that
 * belongs to no category in particular. It rides `effects` at gain 1 and has
 * no slider of its own, because `effects` is already the useful thing to say
 * about the group.
 */
export type SoundBus =
  | 'music'
  | 'effects'
  | 'combat'
  | 'monsters'
  | 'ambient'
  | 'steps'
  | 'drops'
  | 'ui'
  | 'instruments'
  | 'world';

/** The option each bus reads, `null` for the one that has no slider. */
export const BUS_VOLUME_OPTION = {
  music: 'musicVolume',
  effects: 'effectsVolume',
  combat: 'combatVolume',
  monsters: 'monsterVolume',
  ambient: 'ambientVolume',
  steps: 'stepsVolume',
  drops: 'dropVolume',
  ui: 'uiVolume',
  instruments: 'instrumentsVolume',
  world: null,
} as const satisfies Record<SoundBus, keyof typeof GameOptions | null>;

// ---- 2. readers ------------------------------------------------------------

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The original's slider curve: level 0..9 -> gain `level / 10` (SceneCommon.cpp:220-234). */
export function masterGain(): number {
  return clamp01(GameOptions.volume / 10);
}

/**
 * One category's own gain, 0..1, with the master left out - the tracks
 * already carry that. `world` is always 1.
 */
export function busGain(bus: SoundBus): number {
  const option = BUS_VOLUME_OPTION[bus];
  if (option === null) return 1;
  return clamp01(GameOptions[option] / BUS_VOLUME_MAX);
}

/** Nothing on this bus can be heard, so a loop should stop rather than run silent. */
export function busSilent(bus: SoundBus): boolean {
  return busGain(bus) <= 0;
}

/** What the two Babylon tracks are set to, master folded in. */
export function trackGains(): { music: number; effects: number } {
  const master = masterGain();
  return {
    music: master * busGain('music'),
    effects: master * busGain('effects'),
  };
}
