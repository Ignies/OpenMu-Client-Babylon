import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 85,
  name: 'PLAYER_ATTACK_RIDE_ATTACK_FLASH',
  // Dark Lord clips the 0.28 fallback missed (ZzzCharacter.cpp:951, :1011-1012).
  speed: { base: 0.4, plus: 'magicSpeed' },
  // A Dark Lord's Electric Spike charges at half speed over keys 1-3 (ZzzCharacter.cpp:2497-2517); the x0.125 a caster in the hero's party gets is not ported.
  frameSpeeds: [{ after: 1, before: 3, scale: 0.5, darkLordOnly: true }],
  skill: true,
});
