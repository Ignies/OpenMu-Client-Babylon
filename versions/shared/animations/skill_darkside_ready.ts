import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 250,
  name: 'PLAYER_SKILL_DARKSIDE_READY',
  // SetAttackSpeed: 0.3 + AttackSpeed * 0.002 (ZzzCharacter.cpp:1021).
  speed: { base: 0.3, plus: 'rageAttackSpeed' },
  skill: true,
});
