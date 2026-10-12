import { defineMonster } from '@/controllers/monsters';
import { RIGHT_HAND_FX } from './bodyFx';
import { mayaHandDyingBlend } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 363,
  Name: 'Maya Hand',
  // See `bodyFx.ts`.
  bodyFx: RIGHT_HAND_FX,
  // Dying before MAYA3, every mesh additive (GM_Kanturu_3rd.cpp:887, :916).
  dyingBlendAll: mayaHandDyingBlend,
  model: { type: 119, scale: 2.28 },
});
