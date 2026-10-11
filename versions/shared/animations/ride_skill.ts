import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 155,
  name: 'PLAYER_RIDE_SKILL',
  // The rest of SetAttackSpeed's spell block (ZzzCharacter.cpp:860-866).
  speed: { base: 0.3, plus: 'magicSpeed' },
  skill: true,
});
