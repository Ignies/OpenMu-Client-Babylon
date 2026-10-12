import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 379,
  Name: 'Natasha the Firecracker Merchant',
  // Created with `m_bRenderShadow = false` (ZzzCharacter.cpp:14610).
  classicShadow: false,
  npcModel: { file: 'Wedding', scale: 1.1, idle: { base: 0, stay: [12, 16], others: [1, 1], backFrom: [1] } },
});
