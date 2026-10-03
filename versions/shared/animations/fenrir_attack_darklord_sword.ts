import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 93,
  name: 'PLAYER_FENRIR_ATTACK_DARKLORD_SWORD',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
