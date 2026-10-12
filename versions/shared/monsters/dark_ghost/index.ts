import { defineMonster } from '@/controllers/monsters';
import { DARK_GHOST_FX } from './bodyFx';

export default defineMonster({
  Numb: 515,
  Name: 'Grand Wizard',
  maxHealth: 100000,
  // MODEL_DARK_GHOST: see `bodyFx.ts`.
  bodyFx: DARK_GHOST_FX,
  model: { type: 175, scale: 1.3 },
});
