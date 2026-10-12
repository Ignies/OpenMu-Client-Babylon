import { defineMonster } from '@/controllers/monsters';
import { LEFT_HAND_FX } from './bodyFx';

export default defineMonster({
  Numb: 362,
  Name: 'Maya Hand',
  // See `bodyFx.ts`.
  bodyFx: LEFT_HAND_FX,
  model: { type: 118, scale: 2.28 },
});
