import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 66,
  name: 'Aegis',
  voices: ['Sound/mEsisIdle', 'Sound/mEsisIdle', 'Sound/mEsisAttack1', 'Sound/mEsisAttack2', 'Sound/mEsisDeath'],
  clipSpeeds: { [M.Die]: 0.1 },
});
