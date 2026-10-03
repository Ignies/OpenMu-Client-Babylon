import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 374,
  Name: 'Santa',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:13954-13977; model ZzzOpenData.cpp:3936-3989).
  transformed: { dir: 'Skill/', part: 'santa.glb', scale: 0.85 },
});
