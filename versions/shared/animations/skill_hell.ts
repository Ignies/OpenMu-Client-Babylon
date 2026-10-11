import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 154,
  name: 'PLAYER_SKILL_HELL',
  // The rest of SetAttackSpeed's spell block (ZzzCharacter.cpp:860-866).
  speed: { base: 0.5, plus: 'magicSpeed' },
  skill: true,
});
