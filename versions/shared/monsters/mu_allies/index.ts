import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 404,
  Name: 'MU Allies',
  // A player rig in one body part (`c->Object.SubType`, w_CursedTemple.cpp:255-270).
  transformed: { dir: 'Skill/', part: 'unitedsoldier.glb', scale: 1 },
});
