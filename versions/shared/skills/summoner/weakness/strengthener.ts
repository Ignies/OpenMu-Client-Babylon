import { defineSkill } from '@/controllers/skills/define';

import { SLEEP_CLIPS } from '../_shared';

export default defineSkill({
  id: 459,
  name: "Weakness Strengthener",
  soundOnLanding: true,
  sound: 'Sound/SE_Ch_summoner_weakness', // Weakness Strengthener
  clip: SLEEP_CLIPS, // Weakness Str
  target: 'inPlace',
});
