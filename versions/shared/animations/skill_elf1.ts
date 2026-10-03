import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 150,
  name: 'PLAYER_SKILL_ELF1',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
