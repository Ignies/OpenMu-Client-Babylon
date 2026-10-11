import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 11,
  name: 'PLAYER_STOP_FLY',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
});
