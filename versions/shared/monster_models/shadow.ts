import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 28,
  name: 'Shadow',
  voices: ['Sound/mShadow1', 'Sound/mShadow2', 'Sound/mShadowAttack1', 'Sound/mShadowAttack1', 'Sound/mShadowDie'],
  clipSpeeds: { [M.Walk]: 0.3 },
});
