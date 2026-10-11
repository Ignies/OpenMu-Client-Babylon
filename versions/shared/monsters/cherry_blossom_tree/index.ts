import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 451,
  Name: 'Cherry Blossom Tree',
  // Created with `m_bRenderShadow = false` (ZzzCharacter.cpp:14730).
  classicShadow: false,
  // Cherry-blossom event (ZzzCharacter.cpp:14428-14447, models ZzzOpenData.cpp:2093-2098).
  // The original draws it without a shadow; not modelled.
  npcModel: { file: 'cherryblossom/sakuratree', scale: 1 },
});
