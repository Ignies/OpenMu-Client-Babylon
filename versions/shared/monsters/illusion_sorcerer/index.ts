import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 405,
  Name: 'Illusion Sorcerer',
  // A player rig in one body part (`c->Object.SubType`, w_CursedTemple.cpp:255-270).
  transformed: { dir: 'Skill/', part: 'illusionist.glb', scale: 1 },
});
