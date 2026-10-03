import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 13,
  name: 'PLAYER_STOP_RIDE',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
});
