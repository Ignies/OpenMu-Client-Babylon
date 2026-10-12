import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SWORD_DANCER (ZzzObject.cpp:7638-7644): mesh 1 hidden from the body, drawn as lava at
// alpha 0.5 (alpha tested, lit), then itself as the blend mesh scrolling down.
export default defineItemLook({
  items: [[0, 25]],
  body: {
    drawn: [0],
    passes: [
      { mesh: 1, kind: 'blend', texture: 'Effect/lava.OZJ', clamp: true, alpha: 0.5 },
      { mesh: 1, kind: 'add', v: ms => ms * 0.0009 },
    ],
  },
});
