import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 100,
  name: 'Witch Queen',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
