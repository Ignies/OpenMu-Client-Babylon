import { defineAnimation } from '@/controllers/anim';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';

export default defineAnimation({
  action: 38,
  name: 'PLAYER_ATTACK_FIST',
  // SetAttackSpeed (ZzzCharacter.cpp:830-960).
  speed: { base: 0.6, plus: 'attackSpeed' },
  attack: true,
  skill: true,
  serverActions: [S.Attack1, S.Attack2],
});
