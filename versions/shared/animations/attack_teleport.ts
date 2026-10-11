import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 81,
  name: 'PLAYER_ATTACK_TELEPORT',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  // Party Teleport holds the raised hand at a tenth after key 5.5 (ZzzCharacter.cpp:2497-2517).
  frameSpeeds: [{ after: 5.5, scale: 0.1 }],
  skill: true,
});
