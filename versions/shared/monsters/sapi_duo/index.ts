import { defineMonster } from '@/controllers/monsters';
import { sapiClaws, sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 442,
  Name: 'Sapi-Duo',
  maxHealth: 39500,
  // MODEL_SAPIDUO (GMSwampOfQuiet.cpp:822-830).
  bodyFx: [sapiLight([1, 0, 0]), ...sapiClaws([2, 0, 0], [6, 7])],
  model: { type: 137, scale: 1 },
});
