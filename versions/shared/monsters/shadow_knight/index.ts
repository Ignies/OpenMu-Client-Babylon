import { defineMonster } from '@/controllers/monsters';
import { shadowSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 445,
  Name: 'Shadow Knight',
  maxHealth: 52000,
  // MODEL_SHADOW_KNIGHT (GMSwampOfQuiet.cpp:885-896); its death pieces are not here yet.
  bodyFx: [shadowSmoke([0.3, 0.6, 1])],
  model: { type: 140, scale: 1.1 },
});
