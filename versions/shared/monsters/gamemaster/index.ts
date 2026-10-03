import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 378,
  Name: 'GameMaster',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:13954-13977; model ZzzOpenData.cpp:3936-3989).
  transformed: { dir: 'Skill/', part: 'youngza.glb', scale: 1 },
});
