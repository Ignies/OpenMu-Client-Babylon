import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 201,
  name: 'PLAYER_CRY1',
  // Reactions and social clips. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.32,
  emote: true,
  social: true,
  female: 'PLAYER_CRY_FEMALE1',
});
