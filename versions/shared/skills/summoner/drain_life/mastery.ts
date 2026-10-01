import { defineSkill } from '@/controllers/skills/define';

import { DRAIN_LIFE_CLIPS } from './';

import { DRAIN_LIFE_LIGHT } from './';

export default defineSkill({
  id: 462,
  name: "Drain Life Mastery",
  sound: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life Mastery
  clip: DRAIN_LIFE_CLIPS, // Drain Life Mastery
  light: DRAIN_LIFE_LIGHT,
});
