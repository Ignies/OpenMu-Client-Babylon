import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 282,
  name: 'PLAYER_RAGE_FENRIR_ATTACK_RIGHT',
  // Rage Fighter Fenrir clips (ZzzOpenData.cpp:411-427).
  speed: { base: 0.25, plus: 'attackSpeed' },
});
