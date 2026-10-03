import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 16,
  name: 'PLAYER_WALK_FEMALE',
  // SetPlayerWalk rewrites the base table 0.30 every frame it runs (ZzzCharacter.cpp:396-453): walk 0.33, Rage Fighter 0.32.
  speed: { base: 0.33, rageFighter: 0.32 },
  debuffSlows: true,
});
