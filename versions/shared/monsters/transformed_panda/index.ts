import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 503,
  Name: 'Transformed Panda',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:14503-14515; model Event.cpp:116).
  transformed: { dir: 'Item/', part: 'panda.glb', scale: 1 },
});
