import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 172,
  name: 'PLAYER_SKILL_SUMMON',
  // The summons, with no magic speed (ZzzCharacter.cpp:998-1001).
  speed: 0.25,
  skill: true,
});
