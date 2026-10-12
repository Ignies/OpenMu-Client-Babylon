import { defineMonster } from '@/controllers/monsters';
import { sapiClaws, sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 557,
  Name: 'Sapi Queen',
  maxHealth: 218000,
  // MODEL_SAPI_QUEEN (GMSwampOfQuiet.cpp:1136-1146).
  bodyFx: [sapiLight([1, 0.6, 0.1]), ...sapiClaws([1, 0.6, 0.1], [6, 7.6])],
  model: { type: 201, scale: 1.5 },
});
