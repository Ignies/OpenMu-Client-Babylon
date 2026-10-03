import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 72,
  name: 'PLAYER_SKILL_HELL_BEGIN',
  // Nova's charge: 0.5 + MagicSpeed, halved every frame it plays (ZzzCharacter.cpp:947, 2522-2525).
  speed: { base: 0.5, plus: 'magicSpeed', times: 0.5 },
  attack: true,
  skill: true,
});
