import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';

const roll = frameRolls();
/** `rand() % 10 / 500`, the k-th roll of the frame: a flicker of under 0.02. */
const flicker = (k: number) => (ms: number) => Math.floor(roll(ms, k) * 10) / 500;
const pulse = (ms: number) => Math.sin(ms * 0.7) * 0.2 + 0.3;
const turn = (ms: number) => ms * 0.0006 * 360;
const green =
  (r: number, g: number, b: number): LookLight =>
  (ms, _body, out) =>
    out.set(r, g + pulse(ms), b);
const at = (bone: number, sprites: Omit<HeldSprite, 'bone'>[]): HeldSprite[] => sprites.map(s => ({ ...s, bone }));
const head = flicker(3);
const tip = flicker(4);

// MODEL_PLATINA_STAFF (ZzzObject.cpp:7657-7662): mesh 1 hidden from the body, drawn as the blend mesh
// scrolling on both axes.
// Carried (ZzzCharacter.cpp:7377-7443): flares, a counter-turning Shiny02 and a turning magic circle at
// bone 9, small flares on bones 5-8 and 10-13, a green star at 4, and a smaller circle and flares at 2.
export default defineItemLook({
  items: [[5, 13]],
  body: { passes: [{ mesh: 1, kind: 'bright', u: ms => ms * 0.0009, v: ms => ms * 0.0009 }] },
  held: [
    ...at(9, [
      { texture: 'flare01', scale: ms => 0.3 + flicker(0)(ms), light: [0.7, 0.7, 0.7] },
      { texture: 'flare01', scale: ms => 4 + flicker(1)(ms), light: green(0.2, 0.6, 0.2) },
      {
        texture: 'shiny02',
        scale: ms => 1.2 + Math.floor(roll(ms, 2) * 30) / 60,
        light: green(0.4, 0.5, 0.4),
        rotation: ms => -(ms * 0.0004 * 360),
      },
      { texture: 'magicGround1', scale: ms => 0.25 + head(ms), light: [0.6, 1, 0.6], rotation: turn },
    ]),
    ...[0, 1, 2, 3].flatMap((i): HeldSprite[] => [
      { texture: 'flare01', bone: 5 + i, scale: 0.2, light: [0.1, 0.8, 0.1] },
      { texture: 'flare01', bone: 10 + i, scale: 0.3, light: [0.5, 0.5, 0.5] },
    ]),
    { texture: 'shiny02', bone: 4, scale: ms => 0.6 + head(ms), light: [0.1, 0.8, 0.1], rotation: turn },
    ...at(2, [
      { texture: 'magicGround1', scale: ms => 0.15 + tip(ms), light: [0.6, 1, 0.6], rotation: turn },
      { texture: 'flare01', scale: ms => 0.7 + tip(ms), light: [0.8, 0.8, 0.8], rotation: ms => -turn(ms) },
      { texture: 'shiny02', scale: ms => 0.5 + tip(ms), light: [0.1, 1, 0.1], rotation: turn },
      { texture: 'flare01', scale: ms => 2 + tip(ms), light: green(0.2, 0.6, 0.2) },
    ]),
  ],
});
