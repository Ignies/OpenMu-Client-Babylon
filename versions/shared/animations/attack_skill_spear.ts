import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 70,
  name: 'PLAYER_ATTACK_SKILL_SPEAR',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): the skill swings.
  speed: { base: 0.3, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
