import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 249,
  name: 'PLAYER_SKILL_GIANTSWING',
  // SetAttackSpeed: 0.4 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1020).
  speed: { base: 0.4, plus: 'rageAttackSpeed' },
  skill: true,
});
