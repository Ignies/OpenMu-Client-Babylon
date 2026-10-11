import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 256,
  name: 'PLAYER_SKILL_HP_UP_OURFORCES',
  // SetAttackSpeed (ZzzCharacter.cpp:1026).
  speed: 0.35,
  skill: true,
});
