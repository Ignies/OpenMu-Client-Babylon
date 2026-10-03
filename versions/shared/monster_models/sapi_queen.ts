import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 201,
  name: 'Sapi Queen',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
