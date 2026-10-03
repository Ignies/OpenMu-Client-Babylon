import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 132,
  name: 'PLAYER_ATTACK_FLY_BOW_UP',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): bows and crossbows.
  speed: { base: 0.3, plus: 'attackSpeed' },
  skill: true,
});
