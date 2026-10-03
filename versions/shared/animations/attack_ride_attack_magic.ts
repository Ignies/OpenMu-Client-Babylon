import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 86,
  name: 'PLAYER_ATTACK_RIDE_ATTACK_MAGIC',
  // Lightning Orb, Chain Lightning, Drain Life and Lightning Shock with their mounts (ZzzCharacter.cpp:979-996).
  speed: { base: 0.3, plus: 'magicSpeed' },
  skill: true,
});
