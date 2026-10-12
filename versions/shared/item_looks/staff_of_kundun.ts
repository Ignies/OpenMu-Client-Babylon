import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STAFF_OF_KUNDUN (ZzzObject.cpp:7906-7913): the body lit (mesh 2 its blend mesh), Chrome01 over
// mesh 1, mesh 0 again flickering (sinf, nothing below 0), then Chrome02 over it by the CHROME4 look-up.
export default defineItemLook({
  items: [[5, 11]],
  body: {
    passes: [
      { mesh: 1, kind: 'add', ...CHROME01 },
      { mesh: 0, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.005)) },
      { mesh: 0, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4' },
    ],
  },
});
