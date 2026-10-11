import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 99,
  name: 'Ballista',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
