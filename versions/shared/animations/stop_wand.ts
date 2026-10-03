import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 10,
  name: 'PLAYER_STOP_WAND',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.3,
  idle: true,
});
