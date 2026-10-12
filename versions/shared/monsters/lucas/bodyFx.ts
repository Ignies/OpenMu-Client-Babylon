import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, rageSmoke, spot } from '../_shared/bodyFx';

/** `fLumi1 = (sinf(WorldTime * 0.004f) + 0.9f) * 0.25f`, on the light and on each `Scale` (0.225 is in it). */
const SWING = { speed: 0.004, amount: 0.25 };

/**
 * MODEL_LUCAS (Ercanne): RenderMonsterVisual's green lights (GMEmpireGuardian1.cpp:2113-2145) and his rage
 * smoke (:2146-2162). Not here yet: the mesh 3 chrome pass (:1846-1866).
 */
export const LUCAS_FX: MonsterBodyFx = [
  cards(
    [0.05, 0.75, 0.35],
    [
      spot(41, 'light', 1.225, [0, 0, -10]),
      spot(41, 'light', 1.225, [0, 0, 10]),
      spot(42, 'light', 1.225, [0, 0, -10]),
      spot(42, 'light', 1.225, [0, 0, 10]),
      ...[1.2, 1.05, 0.9, 0.75, 0.6, 0.45].map((scale, i) => spot(50 + i, 'light', +(scale + 0.225).toFixed(3), [0, 6, 0])),
    ],
    { lift: { ...SWING, base: 0.225 }, swell: SWING }
  ),
  rageSmoke(76),
];
