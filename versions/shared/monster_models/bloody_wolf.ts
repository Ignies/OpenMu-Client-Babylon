import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 43,
  name: 'Bloody Wolf',
  voices: ['Sound/blood1', 'Sound/blood1', 'Sound/blood_attack1', 'Sound/blood_attack2', 'Sound/blood_die'],
});
