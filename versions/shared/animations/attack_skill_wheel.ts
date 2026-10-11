import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 65,
  name: 'PLAYER_ATTACK_SKILL_WHEEL',
  // SetAttackSpeed's own lines for Wheel, One-to-one and Fury Strike (ZzzCharacter.cpp:923-924, :1007); Rageful Blow ignores attack speed.
  speed: { base: 0.24, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
