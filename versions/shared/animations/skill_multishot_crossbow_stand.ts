import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 180,
  name: 'PLAYER_SKILL_MULTISHOT_CROSSBOW_STAND',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
