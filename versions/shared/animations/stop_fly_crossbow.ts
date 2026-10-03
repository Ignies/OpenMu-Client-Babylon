import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 12,
  name: 'PLAYER_STOP_FLY_CROSSBOW',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
});
