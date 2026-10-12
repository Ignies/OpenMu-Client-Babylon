import { defineMonster } from '@/controllers/monsters';
import { blur } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 565,
  Name: 'Dark Iron Knight',
  maxHealth: 265000,
  // RenderMonsterVisual's swing trail, always on (GM_Raklion.cpp:2104-2126).
  bodyFx: [blur(35, 36, [1, 1.2, 2], 'blur02')],
  model: { type: 208, scale: 1.8 },
});
