import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { runningSparks } from './sword_dancer';

// MODEL_DARK_REIGN_BLADE (ZzzObject.cpp:7558-7565): the body lit, mesh 0 again as the blend mesh
// scrolling, then mesh 1 as the StreamMesh (unlit) scrolling down. Carried, its sparks off bone 1 while
// running (ZzzCharacter.cpp:7698-7720).
export default defineItemLook({
  items: [[0, 21]],
  emit: [runningSparks(1)],
  body: {
    passes: [
      { mesh: 0, kind: 'add', u: ms => ms * 0.0005, v: ms => ms * 0.0005 },
      { mesh: 1, kind: 'unlit', v: ms => ms * 0.0005 },
    ],
  },
});
