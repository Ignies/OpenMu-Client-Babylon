import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 66,
  name: 'PLAYER_ATTACK_SKILL_FURY_STRIKE',
  // SetAttackSpeed's own lines for Wheel, One-to-one and Fury Strike (ZzzCharacter.cpp:923-924, :1007); Rageful Blow ignores attack speed.
  speed: 0.38,
  attack: true,
  skill: true,
});
