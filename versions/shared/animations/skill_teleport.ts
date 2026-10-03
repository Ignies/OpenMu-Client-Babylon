import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 151,
  name: 'PLAYER_SKILL_TELEPORT',
  // Set on its own line past the skill loop (ZzzCharacter.cpp:860): without its magic speed the clip held the cast for a full second.
  speed: { base: 0.3, plus: 'magicSpeed' },
  skill: true,
});
