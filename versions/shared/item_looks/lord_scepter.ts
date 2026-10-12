import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_LORD_SCEPTER (ZzzObject.cpp:7540-7547): the body lit (its scroll has no blend mesh to move),
// then Chrome01 over mesh 1; a chrome pass takes no BlendMeshLight.
export default defineItemLook({
  items: [[2, 11]],
  body: { passes: [{ mesh: 1, kind: 'add', ...CHROME01 }] },
});
