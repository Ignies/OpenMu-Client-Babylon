import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 9,
  name: 'PLAYER_STOP_CROSSBOW',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.22,
  idle: true,
});
