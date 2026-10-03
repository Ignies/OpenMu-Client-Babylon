import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 244,
  name: 'PLAYER_SANTA_2',
  // The base table's 0.40 for everything from PLAYER_SIT1 up (ZzzOpenData.cpp:314-372).
  speed: 0.4,
  serverActions: [S.Santa2_1, S.Santa2_2, S.Santa2_3],
});
