import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 77,
  name: 'PLAYER_DARKLORD_WALK',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  debuffSlows: true,
});
