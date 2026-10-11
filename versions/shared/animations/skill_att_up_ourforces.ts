import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 255,
  name: 'PLAYER_SKILL_ATT_UP_OURFORCES',
  // SetAttackSpeed (ZzzCharacter.cpp:1025).
  speed: 0.35,
  skill: true,
});
