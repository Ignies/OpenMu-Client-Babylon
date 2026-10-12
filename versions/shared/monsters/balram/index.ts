import { defineMonster } from '@/controllers/monsters';
import { crywolfWalkSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 344,
  Name: 'Balram',
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [crywolfWalkSmoke([0.9, 0.2, 0.1])],
  model: { type: 91, scale: 1.25 },
});
