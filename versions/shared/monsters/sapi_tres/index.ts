import { defineMonster } from '@/controllers/monsters';
import { sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 443,
  Name: 'Sapi-Tres',
  maxHealth: 58000,
  // MODEL_SAPITRES (GMSwampOfQuiet.cpp:832-840).
  bodyFx: [sapiLight([0.2, 0.7, 1])],
  model: { type: 138, scale: 1 },
});
