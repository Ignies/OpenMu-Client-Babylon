import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, rageSmoke, spotsOn } from '../_shared/bodyFx';

/** `fLumi1 = (sinf(WorldTime * 0.004f) + 1) * 0.25f`, on the light and on each `Scale` (0.25 is in it). */
const SWING = { speed: 0.004, amount: 0.25 };

/** MODEL_HAMMERIZE (Bermont): RenderMonsterVisual's blue lights and his rage smoke (GMEmpireGuardian2.cpp:864-895). */
export const HAMMERIZE_FX: MonsterBodyFx = [
  cards([0.1, 0.4, 0.8], spotsOn([21, 38], 'light', 1.75), { lift: { ...SWING, base: 0.25 }, swell: SWING }),
  rageSmoke(53),
];
