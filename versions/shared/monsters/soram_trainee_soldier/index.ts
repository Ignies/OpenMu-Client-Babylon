import { defineMonster } from '@/controllers/monsters';
import { crywolfWalkSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 411,
  Name: 'Soram (Trainee Soldier)',
  maxHealth: 90000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [crywolfWalkSmoke([1, 1, 1])],
  model: { type: 94, scale: 1.3 },
});
