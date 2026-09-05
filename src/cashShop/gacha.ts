import type { UiSound } from '../libs/sfx';

/**
 * The drop: every number the gacha reveal is tuned by, in one place.
 *
 * A Box of Luck falls onto the stage, a Jewel of Chaos is fed into it, it
 * rattles, cracks open in the tier's colour, strains, slams shut on the Chaos
 * Machine's failure chime, goes silent, and bursts. `state.ts` runs that
 * schedule and plays the sounds; the window draws whatever phase it is told
 * and writes the per-tier numbers and the reveal's beats onto its stage as
 * custom properties, so the stylesheet's delays are these numbers and not
 * copies of them. The lengths of its animations are the stylesheet's own.
 *
 * Nothing here waits on `animationend`: every beat is a timer from these
 * tables, so an absent or zeroed animation can never strand the machine.
 */

export type Tier = 'common' | 'rare' | 'epic' | 'legendary';

export const TIER_KEYS: readonly Tier[] = ['common', 'rare', 'epic', 'legendary'];

export type Phase =
  | 'idle'
  | 'falling'
  | 'landed'
  | 'rattling'
  | 'seam'
  | 'strain'
  | 'slam'
  | 'hush'
  | 'burst'
  | 'prize'
  | 'settled'
  | 'refused';

// ---- 1. tuning -------------------------------------------------------------

/** The fall, from the press: the only beat that absorbs a slow server. */
export const FALL_MS = 240;

/** A service that has not answered by now has not answered. */
export const PLACE_TIMEOUT_MS = 8000;

/** How long a refused box stays yanked off screen before the stage is idle again. */
export const REFUSED_MS = 600;

/** The rattle's period: ms per shake while the box is shut, and once the seam has split. */
export const RATTLE_MS = { shut: 420, split: 160 } as const;

/**
 * The drop, beat by beat, in ms from the moment the box lands (L). Landing is
 * the first deterministic frame - the order response carries its committed
 * roll - so everything after it is fixed-length theatre. Negative = skipped.
 * `hush` runs for `TIERS[tier].hold`; the `after*` beats are from the burst.
 */
export const BEAT = {
  feed: 40,
  fed: 400,
  knockA: 540,
  knockB: 940,
  seam: 1300,
  announce: 1440,
  strain: 1520,
  slam: 1720,
  hush: 1810,
  afterPrize: 150,
  afterName: 300,
  afterShine: 420,
  afterOption: 480,
  optionStep: 120,
  afterSettle: 1200,
} as const;

/**
 * Beats only the stylesheet keeps: the name's fade and the excellent shine
 * have no sound, and under reduced motion those animations are removed
 * rather than shortened (style.less), so a calm table has nothing to say
 * about them.
 */
type Drawn = 'afterName' | 'afterShine';

/**
 * The same roll with the motion taken out: sound and reading time only. The
 * knocks, the slam and the option ticks are scored to movements that no
 * longer happen, so they are gone rather than early.
 */
export const CALM: { [K in Exclude<keyof typeof BEAT, Drawn>]: number } = {
  feed: 40,
  fed: 200,
  knockA: -1,
  knockB: -1,
  seam: 300,
  announce: 440,
  strain: -1,
  slam: -1,
  hush: -1,
  afterPrize: 0,
  afterOption: 60,
  optionStep: 60,
  afterSettle: 300,
};

/** Under CALM the burst is a fixed beat after the seam, not hush + hold. */
export const CALM_BURST_MS = 700;

export interface TierLook {
  /** `--tier`, the colour of everything the tier touches. */
  colour: string;
  /** Box of Kundun icon level: `item_14_11_<tint>.png`. */
  tint: number;
  /** Light shafts out of the seam. */
  shafts: number;
  /** Seam aura opacity. */
  aura: number;
  /** ms of dead silence after the slam. */
  hold: number;
  /** In-window shockwaves. */
  rings: number;
  /** In-window rays (0 = none). */
  rays: number;
  /** px the shockwave reaches. */
  burst: number;
  /** px of the prize icon's drop-shadow. */
  glow: number;
  /** Excellent shine sweeps across the prize. */
  shimmer: 0 | 1 | 2;
  /** Whether the light leaves the window (the DropLight portal). */
  escape: boolean;
  /** The window frame flash at the burst. */
  frame: boolean;
  /** The one white viewport flash. */
  flash: boolean;
  /** The standing conic halo behind the settled prize. */
  halo: boolean;
  /** Played at `BEAT.announce`, before the item exists. */
  announce: UiSound | null;
}

/**
 * Escalates in kind, not only in hue: the box itself is a different object
 * (the icon pack has all sixteen tints of 14/11), the light crosses the
 * window frame only from epic up, and the silence before the burst grows
 * with the tier. Six independent axes, so a colour-blind or muted player
 * still reads which one they got.
 */
export const TIERS: Record<Tier, TierLook> = {
  common: {
    colour: '#79a9d8', tint: 0, shafts: 2, aura: 0.25, hold: 160, rings: 1, rays: 0,
    burst: 160, glow: 6, shimmer: 0, escape: false, frame: false, flash: false, halo: false,
    announce: null,
  },
  rare: {
    colour: '#b183e8', tint: 5, shafts: 4, aura: 0.35, hold: 220, rings: 1, rays: 0,
    burst: 200, glow: 10, shimmer: 1, escape: false, frame: false, flash: false, halo: false,
    announce: null,
  },
  epic: {
    colour: '#e8bc5c', tint: 9, shafts: 6, aura: 0.45, hold: 280, rings: 2, rays: 8,
    burst: 240, glow: 14, shimmer: 1, escape: true, frame: true, flash: false, halo: false,
    announce: null,
  },
  legendary: {
    colour: '#ff7a4d', tint: 15, shafts: 8, aura: 0.55, hold: 360, rings: 3, rays: 12,
    burst: 240, glow: 18, shimmer: 2, escape: true, frame: true, flash: true, halo: true,
    announce: 'duelStart',
  },
};

/**
 * What plays after `win`, in ms from the burst (DSPlaySound.h: SOUND_JEWEL01,
 * SOUND_MIX_SUCCESS, SOUND_LEVEL_UP). Common gets nothing: the absence is the
 * tier. Epic answers the slam's failure chime with the Chaos Machine's
 * success; legendary adds the level-up on the peak of its flash.
 */
export const TIER_STING: Record<Tier, { key: UiSound; at: number }[]> = {
  common: [],
  rare: [{ key: 'jewel', at: 120 }],
  epic: [{ key: 'mix', at: 120 }],
  legendary: [{ key: 'mix', at: 120 }, { key: 'levelUp', at: 420 }],
};

/**
 * Warmed on every open of the gacha tab: nothing in this repo preloads a
 * sound, the first play would otherwise fetch and decode on the one click
 * that must feel instant, and `evictStale()` drops the buffers again after
 * two map changes.
 */
export const GACHA_SOUNDS: readonly UiSound[] = [
  'coin', 'win', 'dropItem', 'gemstone', 'window', 'mixFailed',
  'jewel', 'mix', 'levelUp', 'duelStart', 'menuMove', 'error',
];
