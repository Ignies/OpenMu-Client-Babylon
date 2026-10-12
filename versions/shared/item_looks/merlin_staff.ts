import { CHROME01, defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const roll = frameRolls();
/**
 * The growing ring's `Object->Timer`: 0.15 up by 0.01 a 25 Hz frame, back to 0.15 past 0.9 (76 frames a
 * cycle); its light, `EyeRight`, starts at (0.7, 0.1, 0.6) and fades by 0.95 a frame once past 0.5.
 */
const ringFrame = (ms: number) => Math.floor(ms / 40) % 76;
const ringFade = (ms: number) => 0.95 ** Math.max(0, ringFrame(ms) - 35);
const RED = [1, 0.1, 0.2] as const;
const GOLD = [0.9, 0.7, 0.4] as const;
const ROSE = [0.9, 0.1, 0.3] as const;
const gem = (bone: number, shine: number, marks: number): HeldSprite[] => [
  { texture: 'shiny05', bone, scale: shine, light: GOLD },
  { texture: 'lightmarks', bone, scale: marks, light: ROSE },
];

// MODEL_STAFF + 32 (ZzzObject.cpp:7153-7160): the body lit, Chrome01 over mesh 0, mesh 2 again additive
// and mesh 3 twice (one pass at twice the light).
// Carried (ZzzCharacter.cpp:8072-8115): a red shine, light marks and a flare at bone 1 with a turning
// shock wave and a growing, fading one; small gems at 2 and 3.
export default defineItemLook({
  items: [[5, 32]],
  body: {
    passes: [
      { mesh: 0, kind: 'add', ...CHROME01 },
      { mesh: 2, kind: 'add' },
      { mesh: 3, kind: 'add', gain: () => 2 },
    ],
  },
  held: [
    { texture: 'shiny05', bone: 1, scale: 0.7, light: RED },
    { texture: 'lightmarks', bone: 1, scale: 0.6, light: RED },
    { texture: 'flare01', bone: 1, scale: 2, light: RED },
    { texture: 'shockWave', bone: 1, scale: 0.65, light: [0.7, 0.1, 0.6], rotation: ms => -(Math.floor(ms * 0.05) % 360) },
    {
      texture: 'shockWave',
      bone: 1,
      scale: ms => 0.15 + ringFrame(ms) * 0.01,
      light: (ms, _body, out) => {
        const f = ringFade(ms);
        out.set(0.7 * f, 0.1 * f, 0.6 * f);
      },
    },
    { texture: 'lightmarks', bone: 1, scale: ms => Math.floor(roll(ms, 0) * 5) / 25 + 0.3, light: [0.9, 0.5, 0.2] },
    ...gem(2, 0.3, 0.4),
    ...gem(3, 0.2, 0.3),
  ],
});
