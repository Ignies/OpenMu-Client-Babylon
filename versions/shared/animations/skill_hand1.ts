import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 146,
  name: 'PLAYER_SKILL_HAND1',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960): the cast clips.
  speed: { base: 0.29, plus: 'magicSpeed' },
  skill: true,
});
