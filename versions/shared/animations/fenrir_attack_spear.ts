import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 99,
  name: 'PLAYER_FENRIR_ATTACK_SPEAR',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
