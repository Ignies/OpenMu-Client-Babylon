import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 260,
  name: 'PLAYER_RAGE_UNI_RUN_ONE_RIGHT',
  // Rewritten to 0.34 by SetPlayerWalk every frame it runs, like the rest of the run block (ZzzCharacter.cpp:435-437).
  speed: 0.34,
});
