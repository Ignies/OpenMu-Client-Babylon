import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 406,
  Name: 'Apostle Devin',
  npcModel: { file: 'devin', idle: { base: 0, stay: [4, 5], others: [1, 1] } },
});
