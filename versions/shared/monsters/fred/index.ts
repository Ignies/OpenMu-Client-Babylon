import { defineMonster } from '@/controllers/monsters';
import { FRED_FX } from './bodyFx';

export default defineMonster({
  Numb: 508,
  Name: 'Destler',
  maxHealth: 1500000,
  // MODEL_FRED: see `bodyFx.ts`.
  bodyFx: FRED_FX,
  model: { type: 168, scale: 1.55 },
});
