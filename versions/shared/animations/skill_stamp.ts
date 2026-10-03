import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 248,
  name: 'PLAYER_SKILL_STAMP',
  // SetAttackSpeed: 0.4 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1019).
  speed: { base: 0.4, plus: 'rageAttackSpeed' },
  skill: true,
});
