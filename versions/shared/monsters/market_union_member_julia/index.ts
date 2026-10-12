import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 547,
  Name: 'Market Union Member Julia',
  npcModel: { file: 'UnitedMarkedPlace_julia', scale: 1, idle: { base: 0, stay: [4, 5], others: [1, 2] } },
});
