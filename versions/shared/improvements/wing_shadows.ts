import { defineImprovement } from '@/controllers/fidelity';

/**
 * Wings cast a shadow, blend mesh included. Classic: none, the shadow pass walks `BodyPart[]` and
 * `Weapon[]` only (ZzzCharacter.cpp:8394-8425). Read in `controllers/actors/wingObject.ts`.
 */
export default defineImprovement({
  id: 'wingShadows',
  preset: 'enhanced',
  labelKey: 'fidelity.wingShadows',
  hintKey: 'fidelity.wingShadows.hint',
});
