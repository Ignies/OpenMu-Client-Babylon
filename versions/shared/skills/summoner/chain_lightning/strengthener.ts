import { defineSkill } from '@/controllers/skills/define';

import { CHAIN_LIGHTNING_CLIPS } from './';

import { CHAIN_LIGHTNING_LIGHT } from './';

export default defineSkill({
  id: 455,
  name: "Chain Lightning Str",
  sound: 'Sound/SE_Ch_summoner_skill08_chainlightning', // Chain Lightning Strengthener
  clip: CHAIN_LIGHTNING_CLIPS, // Chain Lightning Str
  light: CHAIN_LIGHTNING_LIGHT,
});
