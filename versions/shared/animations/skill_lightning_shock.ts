import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 185,
  name: 'PLAYER_SKILL_LIGHTNING_SHOCK',
  // Lightning Orb, Chain Lightning, Drain Life and Lightning Shock with their mounts (ZzzCharacter.cpp:979-996).
  speed: { base: 0.35, plus: 'magicSpeed' },
  skill: true,
});
