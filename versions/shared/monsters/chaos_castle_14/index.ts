import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 427,
  Name: 'Chaos Castle14',
  // Its Energy Ball (17) ends with no SOUND_MAGIC (ZzzCharacter.cpp:5087-5122).
  quietCasts: [17],
  maxHealth: 23000,
  model: { type: 71, scale: 0.9 },
});
