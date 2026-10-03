import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 60,
  name: 'PLAYER_ATTACK_SKILL_SWORD1',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): the skill swings.
  speed: { base: 0.3, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
