import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 213,
  name: 'PLAYER_COLD1',
  // Reactions and social clips. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.32,
  emote: true,
  social: true,
  female: 'PLAYER_COLD_FEMALE1',
  serverActions: [S.Cold],
});
