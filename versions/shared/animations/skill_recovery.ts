import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 182,
  name: 'PLAYER_SKILL_RECOVERY',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
