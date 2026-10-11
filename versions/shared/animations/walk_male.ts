import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 15,
  name: 'PLAYER_WALK_MALE',
  // SetPlayerWalk rewrites the base table 0.30 every frame it runs (ZzzCharacter.cpp:396-453): walk 0.33, Rage Fighter 0.32.
  speed: { base: 0.33, rageFighter: 0.32 },
  debuffSlows: true,
  serverActions: [S.Move1, S.Move2],
});
