import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 7,
  name: 'PLAYER_STOP_SCYTHE',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
});
