import { SILENT_TILES } from '../listener';

/**
 * Where an instrument is heard from: its loudness by distance and its place
 * in the stereo field. Pure functions over tile distances, so the ear can be
 * tested without an audio context.
 *
 * The shared one-shot curve (`listener.ts distanceGain`) is a straight line
 * in amplitude, which the ear reads as flat for most of its length; that is
 * fine for a hit that is over in a moment, but music is continuous and a
 * walk away from it has to be heard as one. So an instrument follows the
 * inverse law instead - half as loud (-6 dB) for every doubling of distance
 * past `FULL_TILES` - and tapers into silence over the last tiles before the
 * shared earshot edge, so a performer leaves earshot where every other sound
 * does.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Tiles inside which a performer is at full level. */
export const FULL_TILES = 4;

/** Tiles over which the level tapers to nothing before `SILENT_TILES`. */
const FADE_TILES = 6;

/** Tiles to one side at which a performer is hard left or hard right. */
export const PAN_TILES = 10;

// ---- 2. the curves ---------------------------------------------------------

/** A performer's level at `d` tiles: 1 up close, inverse law past `FULL_TILES`, 0 from `SILENT_TILES`. */
export function instrumentGain(d: number): number {
  if (d >= SILENT_TILES) return 0;
  if (d <= FULL_TILES) return 1;
  const inverse = FULL_TILES / d;
  const fadeStart = SILENT_TILES - FADE_TILES;
  if (d <= fadeStart) return inverse;
  return inverse * ((SILENT_TILES - d) / FADE_TILES);
}

/**
 * Stereo position for a performer `side` tiles to the listener's right
 * (negative: left): -1 hard left, 1 hard right, straight ahead in between.
 */
export function instrumentPan(side: number): number {
  const pan = side / PAN_TILES;
  return pan < -1 ? -1 : pan > 1 ? 1 : pan;
}
