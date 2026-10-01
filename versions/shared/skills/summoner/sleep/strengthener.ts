import { defineSkill } from '@/controllers/skills/define';

import { SLEEP_CLIPS } from '../_shared';

export default defineSkill({
  id: 454,
  name: "Sleep Strengthener",
  sound: 'Sound/SE_Ch_summoner_skill03_sleep', // Sleep Strengthener
  clip: SLEEP_CLIPS, // Sleep Str
});
