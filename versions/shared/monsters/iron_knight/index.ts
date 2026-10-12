import { defineMonster } from '@/controllers/monsters';
import { blur } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 458,
  Name: 'Iron Knight',
  maxHealth: 95000,
  // RenderMonsterVisual's swing trail, always on (GM_Raklion.cpp:1851-1873).
  bodyFx: [blur(35, 36, [1, 1.2, 2], 'blur02')],
  model: { type: 149, scale: 1.5 },
});
