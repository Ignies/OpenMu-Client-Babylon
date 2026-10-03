import { defineMonsterModel } from '@/controllers/monsters';

// hand-ported: slots 232-236 are shared with Kundun, whose
// case loads its own waves into them; on the siege map they hold these.
export default defineMonsterModel({
  type: 73,
  name: 'Castle Gate1',
  voices: [null, null, null, null, 'Sound/battlecastle/oCDoorDis'],
});
