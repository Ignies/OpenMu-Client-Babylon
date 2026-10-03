import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 175,
  name: 'PLAYER_SKILL_SUMMON_FENRIR',
  // The summons, with no magic speed (ZzzCharacter.cpp:998-1001).
  speed: 0.25,
  skill: true,
});
