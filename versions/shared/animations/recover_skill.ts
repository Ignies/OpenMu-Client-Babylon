import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 246,
  name: 'PLAYER_RECOVER_SKILL',
  // SetAttackSpeed (ZzzCharacter.cpp:1004).
  speed: 0.33,
  skill: true,
});
