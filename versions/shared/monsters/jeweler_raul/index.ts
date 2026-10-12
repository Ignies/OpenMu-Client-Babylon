import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 546,
  Name: 'Jeweler Raul',
  npcModel: { file: 'UnitedMarkedPlace_raul', scale: 1, idle: { base: 0, stay: [4, 5], others: [1, 2] } },
});
