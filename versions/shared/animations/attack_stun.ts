import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 140,
  name: 'PLAYER_ATTACK_STUN',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
