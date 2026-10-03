import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 33,
  name: 'PLAYER_RUN_SWIM',
  // SetPlayerWalk rewrites the base table 0.30 every frame it runs (ZzzCharacter.cpp:396-453): run 0.34, Rage Fighter 0.28. Inside the run loop, so over the base table's 0.35.
  speed: { base: 0.34, rageFighter: 0.28 },
  debuffSlows: true,
});
