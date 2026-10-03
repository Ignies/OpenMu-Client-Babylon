import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 231,
  name: 'PLAYER_DIE1',
  // The base table (ZzzOpenData.cpp:314-372).
  speed: 0.45,
  serverActions: [S.Die1],
});
