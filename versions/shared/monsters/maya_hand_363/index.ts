import { defineMonster } from '@/controllers/monsters';
import { RIGHT_HAND_FX } from './bodyFx';

export default defineMonster({
  Numb: 363,
  Name: 'Maya Hand',
  // See `bodyFx.ts`.
  bodyFx: RIGHT_HAND_FX,
  model: { type: 119, scale: 2.28 },
});
