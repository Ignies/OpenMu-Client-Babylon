import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 373,
  Name: 'Jack Olantern',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:13954-13977; model ZzzOpenData.cpp:3936-3989).
  transformed: { dir: 'Skill/', part: 'jack.glb', scale: 0.95 },
});
