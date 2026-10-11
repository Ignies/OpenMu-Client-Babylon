import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 192,
  name: 'Medusa',
  // Its Die branch drops the shadow (GMSwampOfQuiet.cpp:1116).
  classicShadow: 'alive',
  voices: [null, null, null, null, null],
});
