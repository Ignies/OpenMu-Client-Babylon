import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 4,
  name: 'PLAYER_STOP_SWORD',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.26,
  idle: true,
});
