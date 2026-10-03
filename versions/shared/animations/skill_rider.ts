import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 68,
  name: 'PLAYER_SKILL_RIDER',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): the skill swings.
  speed: { base: 0.3, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
