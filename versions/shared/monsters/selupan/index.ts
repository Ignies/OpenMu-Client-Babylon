import { defineMonster } from '@/controllers/monsters';
import { SELUPAN_FX } from './bodyFx';

export default defineMonster({
  Numb: 459,
  Name: 'Selupan',
  maxHealth: 4800000,
  // MODEL_SELUPAN: see `bodyFx.ts`.
  bodyFx: SELUPAN_FX,
  model: { type: 150, scale: 2 },
});
