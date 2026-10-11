import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 3,
  name: 'PLAYER_STOP_SUMMONER',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.24,
  idle: true,
});
