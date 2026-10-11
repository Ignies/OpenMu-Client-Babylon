import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 75,
  name: 'PLAYER_FLY_RIDE_WEAPON',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
