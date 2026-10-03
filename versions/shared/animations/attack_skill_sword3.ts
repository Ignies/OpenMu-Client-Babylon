import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 62,
  name: 'PLAYER_ATTACK_SKILL_SWORD3',
  // Uppercut (ZzzCharacter.cpp:920).
  speed: { base: 0.27, plus: 'attackSpeed' },
  attack: true,
  skill: true,
});
