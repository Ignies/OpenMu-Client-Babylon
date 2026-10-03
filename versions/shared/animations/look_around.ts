import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 224,
  name: 'PLAYER_LOOK_AROUND',
  // Reactions and social clips. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.32,
  emote: true,
  serverActions: [S.LookAround],
});
