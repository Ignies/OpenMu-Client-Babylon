import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 32,
  name: 'PLAYER_RUN_WAND',
  // SetPlayerWalk's wand rate, set again over the run loop (ZzzCharacter.cpp:396-453).
  speed: 0.76,
});
