import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 134,
  name: 'Grizzly',
  // Throws its own missile silently: Energy Ball (17) plays no SOUND_MAGIC (ZzzCharacter.cpp:5124-5137).
  quietCasts: [17],
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
