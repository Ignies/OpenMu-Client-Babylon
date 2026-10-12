import { defineMonster } from '@/controllers/monsters';
import { shadowSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 446,
  Name: 'Shadow Look',
  maxHealth: 62000,
  // MODEL_SHADOW_LOOK (GMSwampOfQuiet.cpp:928-939); its death pieces are not here yet.
  bodyFx: [shadowSmoke([0.5, 1, 0.5], [1.5, 1.1])],
  model: { type: 141, scale: 1.3 },
});
