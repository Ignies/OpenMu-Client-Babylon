import { defineMonster } from '@/controllers/monsters';
import { blur, ironKnightSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 458,
  Name: 'Iron Knight',
  maxHealth: 95000,
  // RenderMonsterVisual's swing trail, always on, and its bone smokes (GM_Raklion.cpp:1851-1897).
  bodyFx: [blur(35, 36, [1, 1.2, 2], 'blur02'), ironKnightSmoke()],
  model: { type: 149, scale: 1.5 },
});
