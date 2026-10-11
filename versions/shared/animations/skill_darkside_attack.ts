import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 251,
  name: 'PLAYER_SKILL_DARKSIDE_ATTACK',
  // SetAttackSpeed: 0.3 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1022).
  speed: { base: 0.3, plus: 'rageAttackSpeed' },
  skill: true,
});
