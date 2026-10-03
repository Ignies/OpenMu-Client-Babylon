import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 98,
  name: 'PLAYER_FENRIR_ATTACK_CROSSBOW',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.3, plus: 'attackSpeed' },
  skill: true,
});
