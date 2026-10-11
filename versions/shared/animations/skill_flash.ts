import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 152,
  name: 'PLAYER_SKILL_FLASH',
  // The rest of SetAttackSpeed's spell block (ZzzCharacter.cpp:860-866).
  speed: { base: 0.4, plus: 'magicSpeed' },
  // A Dark Lord's Electric Spike charges at half speed over keys 1-3 (ZzzCharacter.cpp:2497-2517); the x0.125 a caster in the hero's party gets is not ported.
  frameSpeeds: [{ after: 1, before: 3, scale: 0.5, darkLordOnly: true }],
  skill: true,
});
