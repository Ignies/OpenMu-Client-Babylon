import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 239,
  name: 'PLAYER_POSE1',
  // The base table's 0.40 for everything from PLAYER_SIT1 up (ZzzOpenData.cpp:314-372).
  speed: 0.4,
  rest: true,
  female: 'PLAYER_POSE_FEMALE1',
  serverActions: [S.Pose],
});
