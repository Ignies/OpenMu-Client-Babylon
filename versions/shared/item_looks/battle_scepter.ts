import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { violetFlares } from './knight_blade';

// MODEL_BATTLE_SCEPTER (ZzzObject.cpp:7078-7085): the body lit, then mesh 0 again as the blend mesh at
// a pulsing BlendMeshLight. Carried: the Knight Blade's violet flares (ZzzCharacter.cpp:7661-7673) on
// bone 1; its loop's bone 2 is past the model's two bones.
export default defineItemLook({
  items: [[2, 8]],
  body: { passes: [{ mesh: 0, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) }] },
  held: violetFlares(1),
});
