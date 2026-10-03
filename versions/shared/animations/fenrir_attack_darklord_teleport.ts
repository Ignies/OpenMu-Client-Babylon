import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 94,
  name: 'PLAYER_FENRIR_ATTACK_DARKLORD_TELEPORT',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: 0.3,
  // Party Teleport holds the raised hand at a tenth after key 5.5 (ZzzCharacter.cpp:2497-2517).
  frameSpeeds: [{ after: 5.5, scale: 0.1 }],
  skill: true,
});
