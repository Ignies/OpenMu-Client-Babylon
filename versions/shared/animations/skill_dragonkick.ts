import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 252,
  name: 'PLAYER_SKILL_DRAGONKICK',
  // SetAttackSpeed: 0.4 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1023).
  speed: { base: 0.4, plus: 'rageAttackSpeed' },
  skill: true,
});
