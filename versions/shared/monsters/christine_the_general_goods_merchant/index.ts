import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 545,
  Name: 'Christine the General Goods Merchant',
  npcModel: { file: 'UnitedMarketPlace_christine', scale: 1.1, idle: { base: 0, stay: [3, 5], others: [1, 2] } },
});
