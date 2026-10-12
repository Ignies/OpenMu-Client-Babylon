import { defineMonster } from '@/controllers/monsters';
import { sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 442,
  Name: 'Sapi-Duo',
  maxHealth: 39500,
  // MODEL_SAPIDUO (GMSwampOfQuiet.cpp:822-830).
  bodyFx: [sapiLight([1, 0, 0])],
  model: { type: 137, scale: 1 },
});
