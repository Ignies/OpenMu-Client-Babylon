import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 92,
  name: 'PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.2, plus: 'attackSpeed' },
  skill: true,
});
