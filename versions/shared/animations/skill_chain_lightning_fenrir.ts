import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 163,
  name: 'PLAYER_SKILL_CHAIN_LIGHTNING_FENRIR',
  // Lightning Orb, Chain Lightning, Drain Life and Lightning Shock with their mounts (ZzzCharacter.cpp:979-996).
  speed: { base: 0.15, plus: 'magicSpeed' },
  skill: true,
});
