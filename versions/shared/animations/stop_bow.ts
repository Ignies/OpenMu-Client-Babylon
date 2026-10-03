import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 8,
  name: 'PLAYER_STOP_BOW',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.22,
  idle: true,
});
