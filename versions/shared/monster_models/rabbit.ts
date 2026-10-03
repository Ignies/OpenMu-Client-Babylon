import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 128,
  name: 'Rabbit',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
