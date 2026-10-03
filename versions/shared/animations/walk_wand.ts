import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 23,
  name: 'PLAYER_WALK_WAND',
  // SetPlayerWalk's wand rate (ZzzCharacter.cpp:396-453); it sits past the walk loop.
  speed: 0.44,
});
