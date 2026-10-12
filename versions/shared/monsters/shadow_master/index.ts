import { defineMonster } from '@/controllers/monsters';
import { shadowSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 559,
  Name: 'Shadow Master',
  maxHealth: 242000,
  // MODEL_SHADOW_MASTER (GMSwampOfQuiet.cpp:1190-1199); its death pieces are not here yet.
  bodyFx: [shadowSmoke([1, 1, 1], [1.5, 1.1])],
  model: { type: 203, scale: 1.56 },
});
