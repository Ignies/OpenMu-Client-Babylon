import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 153,
  name: 'PLAYER_SKILL_INFERNO',
  // The rest of SetAttackSpeed's spell block (ZzzCharacter.cpp:860-866).
  speed: { base: 0.6, plus: 'magicSpeed' },
  skill: true,
});
