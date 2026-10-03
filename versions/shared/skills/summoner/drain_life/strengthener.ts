import { defineSkill } from '@/controllers/skills/define';

import { DRAIN_LIFE_CLIPS } from './';

import { DRAIN_LIFE_LIGHT } from './';

export default defineSkill({
  id: 458,
  name: "Drain Life Strengthener",
  soundOnLanding: true,
  sound: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life Strengthener
  clip: DRAIN_LIFE_CLIPS, // Drain Life Str
  light: DRAIN_LIFE_LIGHT,
});
