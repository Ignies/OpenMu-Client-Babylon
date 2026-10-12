import { defineMonster } from '@/controllers/monsters';
import { sapiLight } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 560,
  Name: 'Sapi Queen',
  // MODEL_SAPI_QUEEN (GMSwampOfQuiet.cpp:1136-1146).
  bodyFx: [sapiLight([1, 0.6, 0.1])],
  model: { type: 201, scale: 1.5 },
});
