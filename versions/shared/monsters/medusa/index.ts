import { defineMonster } from '@/controllers/monsters';
import { MEDUSA_FX } from './bodyFx';

export default defineMonster({
  Numb: 561,
  Name: 'Medusa',
  // MODEL_MEDUSA: see `bodyFx.ts`.
  bodyFx: MEDUSA_FX,
  model: { type: 192, scale: 1.5 },
});
