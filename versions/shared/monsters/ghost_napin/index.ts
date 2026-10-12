import { defineMonster } from '@/controllers/monsters';
import { GHOST_NAPIN_SMOKE } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 448,
  Name: 'Ghost Napin',
  maxHealth: 68000,
  // RenderMonsterVisual's green smokes (GMSwampOfQuiet.cpp:990-1000).
  bodyFx: [GHOST_NAPIN_SMOKE],
  model: { type: 143, scale: 0.95 },
});
