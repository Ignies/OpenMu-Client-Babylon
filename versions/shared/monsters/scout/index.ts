import { defineMonster } from '@/controllers/monsters';
import { SCOUT_BLURS, crywolfWalkSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 318,
  Name: 'Monster 318',
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [...SCOUT_BLURS, crywolfWalkSmoke()],
  model: { type: 98, scale: 1.2 },
});
