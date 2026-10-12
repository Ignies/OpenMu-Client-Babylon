import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const GREEN = [0.5, 0.8, 0.5] as const;
const RED = [0.9, 0.1, 0.3] as const;
const FROST = [0.5, 0.8, 0.6] as const;
const sprite = (texture: HeldSprite['texture'], bone: number, scale: number, light: readonly [number, number, number], rotation?: (ms: number) => number): HeldSprite => ({ texture, bone, scale, light, rotation });

// MODEL_FROST_MACE (ZzzObject.cpp:7128-7134): the body lit but mesh 1, then 1 and 2 additive (its
// mesh 3 call finds no mesh: the model has three).
// Carried (ZzzCharacter.cpp:7840-7927): shiny05 at the gems, a flare and three turning pin lights at the
// head (bone 24), flares up the shaft; its frost cloud and star shine are not ported.
export default defineItemLook({
  items: [[2, 16]],
  body: { passes: [{ mesh: 1, kind: 'bright' }, { mesh: 2, kind: 'add' }] },
  held: [
    sprite('shiny05', 11, 0.2, GREEN),
    sprite('shiny05', 10, 0.2, GREEN),
    sprite('shiny05', 9, 0.2, RED),
    sprite('shiny05', 8, 0.2, RED),
    sprite('shiny05', 1, 0.2, RED),
    sprite('flare01', 1, 0.8, RED),
    sprite('shiny05', 24, 0.3, FROST),
    sprite('flare01', 24, 2, FROST),
    sprite('pinLight', 24, 0.5, FROST, ms => Math.floor(ms * 0.04) % 360),
    sprite('pinLight', 24, 0.7, FROST, ms => -(Math.floor(ms * 0.03) % 360)),
    sprite('pinLight', 24, 0.9, FROST, ms => Math.floor(ms * 0.02) % 360),
    ...[0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.4, 0.4].map((scale, i) => sprite('flare01', i + 12, scale, FROST)),
  ],
});
