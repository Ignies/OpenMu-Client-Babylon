import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 63,
  name: 'Death Angel',
  voices: ['Sound/mDAngelIdle', 'Sound/mDAngelIdle', 'Sound/mDAngelAttack', 'Sound/mDAngelAttack', 'Sound/mDAngelDeath'],
  clipSpeeds: { [M.Die]: 0.1 },
});
