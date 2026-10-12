import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_BATTLE_SCEPTER (ZzzObject.cpp:7078-7085): the body lit, then mesh 0 again as the blend mesh at
// a pulsing BlendMeshLight.
export default defineItemLook({
  items: [[2, 8]],
  body: { passes: [{ mesh: 0, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) }] },
});
