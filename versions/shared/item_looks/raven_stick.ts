import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

/**
 * A magic circle that grows as it fades over a quarter turn of `int(WorldTime * rate) % mod + add`
 * degrees, its light `base + theta * tint`.
 */
const circle = (rate: number, mod: number, add: number, base: readonly number[], tint: readonly number[]): HeldSprite => {
  const angle = (ms: number) => (Math.PI / 180) * ((Math.floor(ms * rate) % mod) + add);
  return {
    texture: 'magicGround1',
    bone: 1,
    scale: ms => Math.abs(Math.sin(angle(ms))) * 0.5,
    light: (ms, _body, out) => {
      const theta = Math.abs(Math.sin(angle(ms) + Math.PI / 2));
      out.set(base[0] + tint[0] * theta, base[1] + tint[1] * theta, base[2] + tint[2] * theta);
    },
  };
};

// MODEL_RAVEN_STICK carried (ZzzCharacter.cpp:8252-8290): shiny05, a flare, Shiny03, two counter-turning pin
// lights and two growing magic circles at the head (bone 1); shiny05 at 2 and 3.
export default defineItemLook({
  items: [[5, 34]],
  held: [
    { texture: 'shiny05', bone: 1, scale: 1.4, light: [0.4, 0.2, 1] },
    { texture: 'flare01', bone: 1, scale: 1.5, light: [0.7, 0.1, 0.9] },
    { texture: 'shiny03', bone: 1, scale: 1.5, light: [0, 0, 1] },
    { texture: 'pinLight', bone: 1, scale: 0.7, light: [0.4, 0.4, 1], rotation: ms => -(Math.floor(ms * 0.04) % 360) },
    { texture: 'pinLight', bone: 1, scale: 0.8, light: [0.4, 0.4, 1], rotation: ms => -(Math.floor(ms * 0.03) % 360) },
    circle(0.02, 90, 0, [0, 0, 0], [0.7, 0.1, 0.9]),
    circle(0.05, 60, 30, [0.1, 0, 0.1], [0.7, 0.1, 0.3]),
    { texture: 'shiny05', bone: 2, scale: 0.8, light: [0.9, 0, 0.1] },
    { texture: 'shiny05', bone: 3, scale: 0.6, light: [0.9, 0.4, 0.7] },
  ],
});
