import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 95,
  name: 'PLAYER_FENRIR_ATTACK_DARKLORD_FLASH',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.4, plus: 'magicSpeed' },
  // A Dark Lord's Electric Spike charges at half speed over keys 1-3 (ZzzCharacter.cpp:2497-2517); the x0.125 a caster in the hero's party gets is not ported.
  frameSpeeds: [{ after: 1, before: 3, scale: 0.5, darkLordOnly: true }],
  skill: true,
});
