import { defineMonster } from '@/controllers/monsters';
import { blur, ironKnightIce, ironKnightSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 565,
  Name: 'Dark Iron Knight',
  maxHealth: 265000,
  // RenderMonsterVisual's swing trail, always on, its bone smokes and its death ice (GM_Raklion.cpp:2104-2223).
  bodyFx: [blur(35, 36, [1, 1.2, 2], 'blur02'), ironKnightSmoke(), ironKnightIce()],
  model: { type: 208, scale: 1.8 },
});
