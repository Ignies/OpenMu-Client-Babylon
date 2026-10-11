import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 493,
  Name: 'Golden Dark Knight',
  // MODEL_DARK_KNIGHT: the haze (ZzzCharacter.cpp:6147).
  bodyFx: [haze()],
  model: { type: 3, scale: 0.8 },
});
