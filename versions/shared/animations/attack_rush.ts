import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 137,
  name: 'PLAYER_ATTACK_RUSH',
  // Crescent Moon Slash (ZzzCharacter.cpp:971).
  speed: { base: 0.3, plus: 'attackSpeed' },
  skill: true,
});
