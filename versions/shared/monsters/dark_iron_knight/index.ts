import { defineMonster } from '@/controllers/monsters';
import { blur, ironKnightSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 565,
  Name: 'Dark Iron Knight',
  maxHealth: 265000,
  // RenderMonsterVisual's swing trail, always on, and its bone smokes (GM_Raklion.cpp:2104-2150).
  bodyFx: [blur(35, 36, [1, 1.2, 2], 'blur02'), ironKnightSmoke()],
  model: { type: 208, scale: 1.8 },
});
