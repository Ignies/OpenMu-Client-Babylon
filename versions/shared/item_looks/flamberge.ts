import { CHROME01, defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

const WHITE = fixedLight(1, 1, 1);

// MODEL_FLAMBERGE (ZzzObject.cpp:7098-7114): meshes 0 and 2 lit; mesh 1 the blend mesh in red,
// then Chrome01 over it in white; 3 and 4 additive; 5 additive, a four-frame strip down v.
export default defineItemLook({
  items: [[0, 26]],
  body: {
    drawn: [0, 2],
    passes: [
      { mesh: 1, kind: 'bright', light: fixedLight(1, 0, 0.2) },
      { mesh: 1, kind: 'add', ...CHROME01, light: WHITE },
      { mesh: 3, kind: 'bright', light: WHITE },
      { mesh: 4, kind: 'bright', light: WHITE },
      { mesh: 5, kind: 'bright', light: WHITE, v: ms => Math.floor((Math.floor(ms * 0.05) % 16) / 4) * 0.25 },
    ],
  },
});
