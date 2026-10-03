import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 91,
  name: 'PLAYER_FENRIR_ATTACK_DARKLORD_AQUA',
  // Fenrir rider clips: 0.45 over the block, run 0.71, stand 0.40 (ZzzOpenData.cpp:388-401).
  speed: 0.45,
  skill: true,
});
