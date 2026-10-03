import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 54,
  name: 'PLAYER_ATTACK_RIDE_SWORD',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960).
  speed: { base: 0.25, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
