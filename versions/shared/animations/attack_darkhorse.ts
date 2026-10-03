import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 87,
  name: 'PLAYER_ATTACK_DARKHORSE',
  // Dark Lord clips the 0.28 fallback missed (ZzzCharacter.cpp:951, :1011-1012).
  speed: 0.3,
  skill: true,
});
