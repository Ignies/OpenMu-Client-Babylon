import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

// hand-ported: the case names its models directly, SetMonsterSound(MODEL_YETI, ...) (ZzzOpenData.cpp:3536)
export default defineMonsterModel({
  type: 12,
  name: 'Yeti',
  // Throws its own missile silently: Energy Ball (17) plays no SOUND_MAGIC (ZzzCharacter.cpp:5124-5137).
  quietCasts: [17],
  voices: ['Sound/mYeti1', 'Sound/mYeti1', 'Sound/mYetiAttack1', 'Sound/mYetiAttack1', 'Sound/mYetiDie'],
  clipSpeeds: { [M.Walk]: 0.3 },
});
