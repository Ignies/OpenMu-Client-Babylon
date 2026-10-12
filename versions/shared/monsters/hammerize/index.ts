import { defineMonster } from '@/controllers/monsters';
import { HAMMERIZE_FX } from './bodyFx';

export default defineMonster({
  Numb: 509,
  Name: 'Vermont',
  maxHealth: 1300000,
  // MODEL_HAMMERIZE: see `bodyFx.ts`.
  bodyFx: HAMMERIZE_FX,
  model: { type: 169, scale: 1.3 },
});
