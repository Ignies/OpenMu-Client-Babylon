import { CHROME01, defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const WHITE = fixedLight(1, 1, 1);
const flare = (bone: number, scale: number, light: readonly [number, number, number]): HeldSprite => ({ texture: 'flare01', bone, scale, light });
const GOLD = [0.8, 0.6, 0.2] as const;
const TEAL = [0.3, 0.8, 0.7] as const;

// MODEL_FLAMBERGE (ZzzObject.cpp:7098-7114): meshes 0 and 2 lit; mesh 1 the blend mesh in red,
// then Chrome01 over it in white; 3 and 4 additive; 5 additive, a four-frame strip down v.
// Carried (ZzzCharacter.cpp:7731-7764): gold and teal flares at the gems (bone 11 twice), red light
// marks on bones 1-7.
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
  held: [
    flare(11, 0.6, GOLD),
    flare(11, 0.6, GOLD),
    flare(12, 0.5, TEAL),
    flare(13, 0.5, TEAL),
    flare(12, 0.3, TEAL),
    flare(13, 0.3, TEAL),
    ...[0.8, 0.7, 0.7, 0.7, 0.6, 0.5, 0.5].map((scale, i): HeldSprite => ({ texture: 'lightmarks', bone: i + 1, scale, light: [0.9, 0.1, 0.1] })),
  ],
});
