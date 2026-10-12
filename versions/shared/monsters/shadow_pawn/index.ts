import { defineMonster } from '@/controllers/monsters';
import { shadowSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 444,
  Name: 'Shadow Pawn',
  maxHealth: 48500,
  // MODEL_SHADOW_PAWN (GMSwampOfQuiet.cpp:842-853); its death pieces are not here yet.
  bodyFx: [shadowSmoke([1, 0.1, 0.1])],
  model: { type: 139, scale: 1.1 },
});
