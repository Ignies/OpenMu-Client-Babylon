import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 578,
  Name: 'Weapons Merchant Bolo',
  npcModel: { file: 'volvo', scale: 0.9, idle: { base: 0, stay: [4, 5], others: [1, 1] } },
});
