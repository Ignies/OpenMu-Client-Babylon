import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 215,
  name: 'PLAYER_AGAIN1',
  // Reactions and social clips. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.32,
  emote: true,
  social: true,
  female: 'PLAYER_AGAIN_FEMALE1',
  serverActions: [S.Again],
});
