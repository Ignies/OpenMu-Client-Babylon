import { defineSkill } from '@/controllers/skills/define';

import { EARTH_PRISON_ENHANCED, EARTH_PRISON_LIGHT } from './';

export default defineSkill({
  id: 497,
  name: "Earth Prison Str",
  sound: 'Sound/sDarkEarthQuake', // Earth Prison Strengthener
  light: { impact: EARTH_PRISON_LIGHT, enhanced: EARTH_PRISON_ENHANCED },
});
