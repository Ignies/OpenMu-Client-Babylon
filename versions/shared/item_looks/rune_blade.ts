import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';
import { runningSparks } from './sword_dancer';

// MODEL_RUNE_BLADE (ZzzObject.cpp:7035-7049): meshes 3 and 1 lit, 1 again as the blend mesh, 0 as
// opaque Chrome01, then 2 additive in a grey off the body's red, scrolling. Carried, its sparks off
// bone 1 while running (ZzzCharacter.cpp:7698-7720).
export default defineItemLook({
  items: [[0, 31]],
  emit: [runningSparks(1)],
  body: {
    drawn: [1, 3],
    passes: [
      { mesh: 1, kind: 'add' },
      { mesh: 0, kind: 'unlit', ...CHROME01 },
      {
        mesh: 2,
        kind: 'bright',
        light: (ms, body, out) => {
          const l = body.x * (Math.sin(ms * 0.001) * 0.5 + 0.5);
          out.set(l, l, l);
        },
        u: ms => ms * 0.0001,
        v: ms => -ms * 0.0005,
      },
    ],
  },
});
