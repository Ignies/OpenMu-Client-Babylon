import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 83,
  name: 'PLAYER_ATTACK_RIDE_TELEPORT',
  // Dark Lord clips the 0.28 fallback missed (ZzzCharacter.cpp:951, :1011-1012).
  speed: 0.3,
  // Party Teleport holds the raised hand at a tenth after key 5.5 (ZzzCharacter.cpp:2497-2517).
  frameSpeeds: [{ after: 5.5, scale: 0.1 }],
  skill: true,
});
