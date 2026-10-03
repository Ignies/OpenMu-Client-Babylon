import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 247,
  name: 'PLAYER_SKILL_THRUST',
  // SetAttackSpeed: 0.4 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1016-1018).
  speed: { base: 0.4, plus: 'rageAttackSpeed' },
  skill: true,
});
