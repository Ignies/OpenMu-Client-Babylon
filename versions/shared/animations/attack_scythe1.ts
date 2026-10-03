import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 47,
  name: 'PLAYER_ATTACK_SCYTHE1',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960).
  speed: { base: 0.25, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
