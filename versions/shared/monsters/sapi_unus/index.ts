import { defineMonster } from '@/controllers/monsters';
import { sapiClaws, sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 441,
  Name: 'Sapi-Unus',
  maxHealth: 37000,
  // MODEL_SAPIUNUS (GMSwampOfQuiet.cpp:812-820).
  bodyFx: [sapiLight([1, 0.6, 0.1]), ...sapiClaws([1, 0.6, 0.1], [6, 7.6])],
  model: { type: 136, scale: 1 },
});
