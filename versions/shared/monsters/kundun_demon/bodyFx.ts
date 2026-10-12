import type { MonsterBodyFx } from '@/controllers/monsters';
import { cards, puff, spotsOn } from '../_shared/bodyFx';

/**
 * MODEL_ILLUSION_OF_KUNDUN: the bone 6 smoke of MoveHellasMonsterVisual (GMHellas.cpp:1433-1440)
 * and, while alive, RenderHellasMonsterVisual's eyes, bone 100 flare and its smoke (:1570-1632).
 * Not here yet: the Shock roar's red flare and smoke scale (fRoar, :1596-1622).
 */
export const KUNDUN_FX: MonsterBodyFx = [
  puff(2, [6], ['smoke17'], [1, 0.2, 0], { local: [2, 30, 0] }),
  cards([1, 0, 0], spotsOn([8, 9], 'energy', 0.4), {
    pulse: { speed: 0.003, amount: 0.2, base: 0.8 },
    gate: { alive: true },
  }),
  cards([1, 1, 1], spotsOn([100], 'flareBlue', 1.2), { swell: { speed: 0.001, amount: 0.3 }, gate: { alive: true } }),
  puff(2, [100], ['smoke13'], [1, 1, 1], { gate: { alive: true } }),
];
