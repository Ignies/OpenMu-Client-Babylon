import type { EventLayer } from './layer';
import { matchNoticesLayer } from './matchNotices';
import { invasionLayer } from './invasion';
import { bloodCastleLayer } from './bloodCastle';
import { devilSquareLayer } from './devilSquare';
import { chaosCastleLayer } from './chaosCastle';
import { duelLayer } from './duel';
import { doppelgangerLayer } from './doppelganger';
import { crywolfLayer } from './crywolf';
import { goldenArcherLayer } from './goldenArcher';

/**
 * THE list. Every event in the game is one entry here, and adding an event
 * is adding one line. Nothing else in the codebase enumerates them.
 *
 * Order is update order. Nothing reads another entry today, so it is only
 * the order the HUD's readers settle in: the shared countdown line first,
 * then the three events.
 */
export const EVENT_LAYERS: readonly EventLayer[] = [
  matchNoticesLayer, // the 30 s state line + invasion banners, every map
  invasionLayer, // dragon invasion sky FX and sounds, every map
  bloodCastleLayer,
  devilSquareLayer,
  chaosCastleLayer,
  duelLayer,
  doppelgangerLayer,
  crywolfLayer,
  goldenArcherLayer, // Rena registration dialog, no match of its own
];
