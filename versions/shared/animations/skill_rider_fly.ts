import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 69,
  name: 'PLAYER_SKILL_RIDER_FLY',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): the skill swings.
  speed: { base: 0.3, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
