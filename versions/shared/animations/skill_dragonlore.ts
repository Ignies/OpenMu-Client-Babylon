import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 253,
  name: 'PLAYER_SKILL_DRAGONLORE',
  // SetAttackSpeed: 0.3 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1024).
  speed: { base: 0.3, plus: 'rageAttackSpeed' },
  skill: true,
});
