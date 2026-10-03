import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 6,
  name: 'PLAYER_STOP_SPEAR',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.24,
  idle: true,
});
