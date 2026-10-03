import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 138,
  name: 'Sapitres',
  // Throws its own missile silently: Energy Ball (17) plays no SOUND_MAGIC (ZzzCharacter.cpp:5124-5137).
  quietCasts: [17],
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
