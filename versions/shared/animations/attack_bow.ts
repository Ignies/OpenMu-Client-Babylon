import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 50,
  name: 'PLAYER_ATTACK_BOW',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): bows and crossbows.
  speed: { base: 0.3, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
