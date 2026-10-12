import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_MASTER_SCEPTER (ZzzObject.cpp:7086-7097): the body lit, mesh 0 again as the blend mesh in blue
// at a pulsing BlendMeshLight, then mesh 1 as the blend mesh with Chrome01 on its UVs, scrolling.
export default defineItemLook({
  items: [[2, 9]],
  body: {
    passes: [
      { mesh: 0, kind: 'add', light: fixedLight(0.1, 0.3, 1), gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) },
      { mesh: 1, kind: 'add', texture: 'Effect/Chrome01.OZJ', light: fixedLight(0.6, 0.8, 1), v: ms => ms * 0.0003 },
    ],
  },
});
