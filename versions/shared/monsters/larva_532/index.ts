import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 532,
  Name: 'Larva',
  // MODEL_LARVA: the haze (ZzzCharacter.cpp:6148).
  bodyFx: [haze()],
  model: { type: 6, scale: 0.6 },
});
