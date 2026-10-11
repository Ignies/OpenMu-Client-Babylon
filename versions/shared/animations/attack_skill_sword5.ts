import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 64,
  name: 'PLAYER_ATTACK_SKILL_SWORD5',
  // Slash (ZzzCharacter.cpp:922).
  speed: { base: 0.24, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
