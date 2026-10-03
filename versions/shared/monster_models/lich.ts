import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 4,
  name: 'Lich',
  voices: ['Sound/mWizard1', 'Sound/mWizard2', 'Sound/mWizardAttack1', 'Sound/mWizardAttack2', 'Sound/mWizardDie'],
});
