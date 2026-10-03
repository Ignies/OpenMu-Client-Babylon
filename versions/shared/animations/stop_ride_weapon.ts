import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 14,
  name: 'PLAYER_STOP_RIDE_WEAPON',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
});
