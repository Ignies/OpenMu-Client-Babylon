import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 134,
  name: 'PLAYER_ATTACK_RIDE_BOW_UP',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): bows and crossbows.
  speed: { base: 0.3, plus: 'attackSpeed' },
  skill: true,
});
