import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 101,
  name: 'Golden Stone Golem',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
