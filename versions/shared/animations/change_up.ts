import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 245,
  name: 'PLAYER_CHANGE_UP',
  // The base table's 0.40 for everything from PLAYER_SIT1 up (ZzzOpenData.cpp:314-372).
  speed: 0.4,
});
