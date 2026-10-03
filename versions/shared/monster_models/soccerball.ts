import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 200,
  name: 'Soccerball',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
