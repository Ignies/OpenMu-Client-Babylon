import { defineMonster } from '@/controllers/monsters';
import { LUCAS_FX } from './bodyFx';

export default defineMonster({
  Numb: 507,
  Name: 'Erkanne',
  maxHealth: 1200000,
  // MODEL_LUCAS: see `bodyFx.ts`.
  bodyFx: LUCAS_FX,
  model: { type: 167, scale: 1.25 },
});
