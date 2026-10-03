import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 168,
  name: 'PLAYER_SKILL_DRAIN_LIFE',
  // Lightning Orb, Chain Lightning, Drain Life and Lightning Shock with their mounts (ZzzCharacter.cpp:979-996).
  speed: { base: 0.25, plus: 'magicSpeed' },
  skill: true,
});
