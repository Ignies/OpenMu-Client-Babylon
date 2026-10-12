import { CHROME01, defineItemLook, randomTurn } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const AMBER = [1, 0.6, 0.3] as const;

// MODEL_LORD_SCEPTER (ZzzObject.cpp:7540-7547): the body lit (its scroll has no blend mesh to move),
// then Chrome01 over mesh 1; a chrome pass takes no BlendMeshLight.
// Carried (ZzzCharacter.cpp:7631-7646): an amber flare at bone 1, three along bone 2 each with a randomly
// turned Shiny02.
export default defineItemLook({
  items: [[2, 11]],
  body: { passes: [{ mesh: 1, kind: 'add', ...CHROME01 }] },
  held: [
    { texture: 'flare01', bone: 1, scale: 1.3, light: AMBER },
    ...[0, 1, 2].flatMap((i): HeldSprite[] => [
      { texture: 'flare01', bone: 2, offset: [i * 15 - 10, 0, 0], scale: 1.3, light: AMBER },
      { texture: 'shiny02', bone: 2, offset: [i * 15 - 10, 0, 0], scale: 0.4, light: AMBER, rotation: randomTurn },
    ]),
  ],
});
