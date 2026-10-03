import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 35,
  name: 'Valkyrie',
  voices: ['Sound/mValkyrie1', 'Sound/mValkyrie1', null, null, 'Sound/mValkyrieDie'],
});
