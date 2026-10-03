import { defineMonsterModel } from '@/controllers/monsters';

// hand-ported: ZzzOpenData.cpp:3767-3776 (word / rage / cure lines are event staged)
export default defineMonsterModel({
  type: 150,
  name: 'Selupan',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
