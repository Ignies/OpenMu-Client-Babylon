import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 71,
  name: 'PLAYER_ATTACK_ONETOONE',
  // SetAttackSpeed's own lines for Wheel, One-to-one and Fury Strike (ZzzCharacter.cpp:923-924, :1007); Rageful Blow ignores attack speed.
  speed: { base: 0.25, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
