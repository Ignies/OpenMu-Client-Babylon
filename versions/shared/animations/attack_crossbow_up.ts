import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 131,
  name: 'PLAYER_ATTACK_CROSSBOW_UP',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): bows and crossbows.
  speed: { base: 0.3, plus: 'attackSpeed' },
  skill: true,
});
