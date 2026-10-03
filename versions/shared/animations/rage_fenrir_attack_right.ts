import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 282,
  name: 'PLAYER_RAGE_FENRIR_ATTACK_RIGHT',
  // SetAttackSpeed: 0.25 + AttackSpeed * 0.002, over the Fenrir table (ZzzCharacter.cpp:1027).
  speed: { base: 0.25, plus: 'rageAttackSpeed' },
});
