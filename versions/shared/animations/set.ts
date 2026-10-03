import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 0,
  name: 'PLAYER_SET',
  // The base table's 0.28 default (ZzzOpenData.cpp:314-372).
  speed: 0.28,
});
