import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 1,
  name: 'PLAYER_STOP_MALE',
  // Idle. The base table (ZzzOpenData.cpp:314-372).
  speed: 0.28,
  idle: true,
  serverActions: [S.Stand1, S.Stand2],
});
