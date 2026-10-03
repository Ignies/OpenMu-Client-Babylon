import { defineMonster } from '@/controllers/monsters';
import { BULL_SNORT } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 364,
  Name: 'Maya',
  // MODEL_BULL_FIGHTER's snort (ZzzCharacter.cpp:6189-6205).
  bodyFx: BULL_SNORT,
  model: { type: 0, scale: 0.2 },
});
