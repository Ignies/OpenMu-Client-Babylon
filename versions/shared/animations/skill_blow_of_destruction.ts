import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 176,
  name: 'PLAYER_SKILL_BLOW_OF_DESTRUCTION',
  // No attack speed on it (ZzzCharacter.cpp:1003).
  speed: 0.3,
  skill: true,
});
