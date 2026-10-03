import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 10,
  name: 'Cyclops',
  voices: ['Sound/mOgre1', 'Sound/mOgre2', 'Sound/mOgreAttack1', 'Sound/mOgreAttack2', 'Sound/mOgreDie'],
  clipSpeeds: { [M.Walk]: 0.28 },
});
