import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 150,
  name: 'PLAYER_SKILL_ELF1',
  // SetAttackSpeed, run after the base table at load and on every cast (ZzzCharacter.cpp:936).
  speed: { base: 0.25, plus: 'magicSpeedStepped' },
  skill: true,
});
