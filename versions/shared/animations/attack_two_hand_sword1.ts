import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 43,
  name: 'PLAYER_ATTACK_TWO_HAND_SWORD1',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960).
  speed: { base: 0.25, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
