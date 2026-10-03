import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 48,
  name: 'Cursed King',
  voices: ['Sound/mCursedKing1', 'Sound/mCursedKing2', null, null, 'Sound/mCursedKingDie1'],
});
