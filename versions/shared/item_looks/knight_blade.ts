import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_KNIGHT_BLADE (ZzzObject.cpp:7548-7557): the body lit, mesh 2 again at a pulsing
// BlendMeshLight (a negative glColor draws nothing), mesh 1 again, Chrome01 on the edge (mesh 3).
export default defineItemLook({
  items: [[0, 20]],
  body: {
    passes: [
      { mesh: 2, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.0008) * 0.7 + 0.5) },
      { mesh: 1, kind: 'add' },
      { mesh: 3, kind: 'add', ...CHROME01 },
    ],
  },
});
