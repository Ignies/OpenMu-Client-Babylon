import { defineMonster } from '@/controllers/monsters';
import { DEATH_SPIRIT_BLURS, crywolfWalkSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 410,
  Name: 'Death Spirit (Trainee Soldier)',
  maxHealth: 85000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [...DEATH_SPIRIT_BLURS, crywolfWalkSmoke([0.9, 0.2, 0.1])],
  model: { type: 93, scale: 1.25 },
});
