import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 74,
  name: 'PLAYER_FLY_RIDE',
  aliases: ['PLAYER_ATTACK_END'],
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  skill: true,
});
