import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 24,
  name: 'PLAYER_WALK_SWIM',
  // The base table's swim rate (ZzzOpenData.cpp:314-372); it sits past SetPlayerWalk's walk loop.
  speed: 0.35,
});
