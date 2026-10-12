import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';

const roll = frameRolls();
const pulse = (ms: number) => Math.sin(ms * 0.001) * 0.5 + 0.7;
const warm: LookLight = (ms, _body, out) => {
  const l = pulse(ms);
  out.set(l, l * 0.8, l * 0.6);
};
/** `Luminosity * -10` cm along bone 1: the gem swings with the pulse. */
const swing = (ms: number, out: Vector3): void => {
  out.set(pulse(ms) * -10, 0, 0);
};
const turn = (ms: number) => Math.floor(roll(ms, 0) * 360);
const BLUE = [0.6, 0.8, 1] as const;
const gem = (texture: HeldSprite['texture'], scale: number, rotation?: (ms: number) => number): HeldSprite => ({
  texture,
  bone: 1,
  offset: swing,
  scale,
  light: BLUE,
  rotation,
});

// MODEL_GREAT_SCEPTER (ZzzObject.cpp:7528-7539): mesh 2 hidden from the body, drawn as the blend mesh
// scrolling on both axes.
// Carried (ZzzCharacter.cpp:7612-7630): a pulsing warm flare and Shiny02 at bone 2, a blue flare and two
// Shiny02 turned both ways at a point of bone 1 that swings with the pulse.
export default defineItemLook({
  items: [[2, 10]],
  body: { passes: [{ mesh: 2, kind: 'bright', u: ms => ms * 0.0005, v: ms => ms * 0.0005 }] },
  held: [
    { texture: 'flare01', bone: 2, scale: 1.5, light: warm },
    { texture: 'shiny02', bone: 2, scale: ms => pulse(ms) * 0.5, light: warm },
    gem('flare01', 0.7),
    gem('shiny02', 0.5, turn),
    gem('shiny02', 0.4, ms => 360 - turn(ms)),
  ],
});
