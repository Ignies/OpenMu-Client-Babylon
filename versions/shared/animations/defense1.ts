import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 186,
  name: 'PLAYER_DEFENSE1',
  // Reactions and social clips. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.32,
  // Defense's guard pose (SkillCast.cpp:227) plays through before the idle takes over.
  oneShot: true,
});
