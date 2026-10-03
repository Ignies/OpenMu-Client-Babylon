import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 100,
  name: 'PLAYER_FENRIR_ATTACK_ONE_SWORD',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
