import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 97,
  name: 'PLAYER_FENRIR_ATTACK_MAGIC',
  // Fenrir attacks per SetAttackSpeed (ZzzCharacter.cpp:873-882).
  speed: { base: 0.37, plus: 'magicSpeed' },
  skill: true,
});
