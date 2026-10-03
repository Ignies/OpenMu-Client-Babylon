import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 450,
  Name: 'Cherry Blossom Spirit',
  // Cherry-blossom event (ZzzCharacter.cpp:14428-14447, models ZzzOpenData.cpp:2093-2098).
  // The original floats it 170 units above the terrain; not modelled.
  npcModel: { file: 'cherryblossom/cherry_blossom', scale: 0.65 },
});
