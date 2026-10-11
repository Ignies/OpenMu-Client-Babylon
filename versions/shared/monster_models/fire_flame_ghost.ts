import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 154,
  name: 'Fire Flame Ghost',
  // Its Die branch drops the shadow (ZzzObject.cpp:2357).
  classicShadow: 'alive',
  voices: [null, null, null, null, null],
});
