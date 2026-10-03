import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 39,
  name: 'Titan',
  voices: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
  clipSpeeds: { [M.Walk]: 0.22 },
});
