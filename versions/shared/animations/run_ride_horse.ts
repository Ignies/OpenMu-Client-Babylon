import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 79,
  name: 'PLAYER_RUN_RIDE_HORSE',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  debuffSlows: true,
});
