import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STORM_BLITZ_STICK (ZzzObject.cpp:7919-7924): the body lit, mesh 1 again as the blend mesh at a
// pulsing BlendMeshLight (nothing below 0).
export default defineItemLook({
  items: [[5, 19]],
  body: { passes: [{ mesh: 1, kind: 'add', gain: ms => Math.max(0, (Math.sin(ms * 0.002) + 0.5) * 0.5) }] },
});
