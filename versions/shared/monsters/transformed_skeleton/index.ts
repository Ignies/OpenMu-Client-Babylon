import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 548,
  Name: 'Transformed Skeleton',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:14503-14515; model Event.cpp:116).
  transformed: { dir: 'Item/', part: 'trans_skeleton.glb', scale: 1 },
});
