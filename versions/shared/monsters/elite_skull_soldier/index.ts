import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 372,
  Name: 'Elite Skull Soldier',
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:13954-13977; model ZzzOpenData.cpp:3936-3989).
  // `MODEL_SKELETON_PCBANG` loads Skill/Skeleton index 3, the part the Elite Skeleton wears.
  transformed: { dir: 'Skill/', part: 'Skeleton03.glb', scale: 0.95 },
});
