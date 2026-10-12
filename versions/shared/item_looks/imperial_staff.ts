import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';
import { VIOLET, energyTrail } from './imperial_sword';
import { spark11 } from './sylph_wind_bow';

const roll = frameRolls();
const size = (ms: number) => Math.floor(roll(ms, 0) * 15) / 20 + 1;
const BLUE = [0.3, 0.3, 0.9] as const;
const PINK = [0.9, 0.3, 0.5] as const;
const flare = (bone: number, scale: number, light: readonly [number, number, number] = BLUE): HeldSprite => ({ texture: 'flare01', bone, scale, light });

// MODEL_IMPERIAL_STAFF (ZzzObject.cpp:7143-7152): the body lit, mesh 1 again additive, then mesh 0 as
// the blend mesh with the socket bitmap at |sin| + 0.1, drawn three times (one pass at three times that).
// Carried (ZzzCharacter.cpp:8035-8071): blue flares on bones 2-4, a red flare, shiny05, two Shiny02 and
// Shiny03 at the head (5), a violet energy trail and pink sparks off it.
export default defineItemLook({
  items: [[5, 31]],
  emit: [energyTrail(5, VIOLET, 30), spark11(5, 1, 2, PINK)],
  body: {
    passes: [
      { mesh: 1, kind: 'add' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Item/soketmagic_stape02.OZJ',
        clamp: true,
        gain: ms => (Math.abs(Math.sin(ms * 0.001)) + 0.1) * 3,
      },
    ],
  },
  held: [
    flare(2, 2),
    flare(2, 2),
    flare(3, 2.5),
    flare(3, 2.5),
    flare(4, 3),
    flare(5, 2, [0.7, 0.1, 0.2]),
    { texture: 'shiny05', bone: 5, scale: 0.8, light: PINK },
    { texture: 'shiny02', bone: 5, scale: size, light: PINK },
    { texture: 'shiny02', bone: 5, scale: ms => size(ms) - 0.3, light: PINK, rotation: () => 90 },
    { texture: 'shiny03', bone: 5, scale: 2, light: [0.7, 0.7, 0.7] },
  ],
});
