import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 177,
  name: 'PLAYER_SKILL_SWELL_OF_MP',
  // A flat 0.2 from the base table; SetAttackSpeed never touches it (ZzzCharacter.cpp:1005).
  speed: 0.2,
  skill: true,
});
