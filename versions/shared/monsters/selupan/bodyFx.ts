import type { BodyCardSpot, MonsterBodyFx } from '@/controllers/monsters';
import { blur, cards } from '../_shared/bodyFx';

/** `fLumi2 = (sinf(WorldTime * 0.004f) + 1) * 0.2f` on a card's `Scale`: 0.2 is in each spot's scale. */
const SWELL = { speed: 0.004, amount: 0.2 };

const spot = (bone: number, card: BodyCardSpot['card'], scale: number, spin?: number): BodyCardSpot =>
  spin === undefined ? { bone, card, scale } : { bone, card, scale, spin };

/**
 * MODEL_SELUPAN: RenderMonsterVisual's cards (GM_Raklion.cpp:2003-2049), lit `base + fLumi1` on
 * each channel, and the always-on bone 69-73 weapon blur (:1977-1998). His mesh passes are in `index.ts`.
 * Not here yet: the BITMAP_SPARK + 1 on bone 71 (:2042).
 */
export const SELUPAN_FX: MonsterBodyFx = [
  cards(
    [0.3, 0.6, 1],
    [
      { bone: 9, card: 'light', scale: 2.2, local: [0, 10, 0] },
      { bone: 9, card: 'light', scale: 2.2, local: [0, 10, 0] },
      { bone: 9, card: 'light', scale: 3.2, local: [0, 10, 0] },
    ],
    { lift: { speed: 0.004, amount: 0.25, base: 0.25 }, swell: SWELL }
  ),
  cards(
    [0.1, 0.2, 1],
    [
      spot(70, 'light', 2.3, 0.08),
      spot(70, 'shiny6', 2),
      spot(74, 'light', 2.3, 0.08),
      spot(74, 'shiny6', 2),
      spot(71, 'light', 2.5),
      spot(71, 'shiny2', 2.5, 0.08),
      spot(71, 'shiny6', 2.5, 0.15),
      spot(72, 'light', 2),
      spot(72, 'shiny6', 1.5),
    ],
    { lift: { speed: 0.004, amount: 0.1, base: 0.1 }, swell: SWELL }
  ),
  cards([0.1, 0.2, 1], [spot(71, 'eventCloud', 0.6, -0.1), spot(71, 'eventCloud', 0.4, -0.2)], {
    lift: { speed: 0.004, amount: 0.1, base: 0.1 },
  }),
  blur(69, 73, [1, 1.2, 2], 'blur01'),
];
