import { defineMonster } from '@/controllers/monsters';
import { sapiClaws, sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 443,
  Name: 'Sapi-Tres',
  maxHealth: 58000,
  // MODEL_SAPITRES (GMSwampOfQuiet.cpp:832-840).
  // Both hands' claws, the right from bone 75 (:700-751).
  bodyFx: [sapiLight([0.2, 0.7, 1]), ...sapiClaws([0.3, 0.7, 1], [5, 10]), ...sapiClaws([0.3, 0.7, 1], [5, 10], 75, [76, 79, 80, 83, 84])],
  model: { type: 138, scale: 1 },
});
