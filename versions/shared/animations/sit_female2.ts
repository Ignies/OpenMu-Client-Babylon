import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 236,
  name: 'PLAYER_SIT_FEMALE2',
  // The base table's 0.40 for everything from PLAYER_SIT1 up (ZzzOpenData.cpp:314-372).
  speed: 0.4,
  rest: true,
});
