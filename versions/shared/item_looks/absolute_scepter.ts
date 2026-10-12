import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';

const roll = frameRolls();
const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * `g_ItemObject[Type]`'s state, shared by every carrier: in the first 100 ms of each second it re-rolls,
 * each frame, the bolt sheet (`m_iAnimation`) and the two bolts' offsets (`EyeRight`, `EyeRight2`).
 */
const bolt = { ms: -1, sheet: 0, a: [0, 0, 0], b: [0, 0, 0] };
function bolts(ms: number): typeof bolt {
  if (bolt.ms !== ms) {
    bolt.ms = ms;
    if (Math.floor(Math.floor(ms) / 100) % 10 === 0) {
      bolt.sheet = Math.floor(rand(100) / 10) % 3;
      for (let i = 0; i < 3; i++) bolt.a[i] = rand(10) - 5;
      for (let i = 0; i < 3; i++) bolt.b[i] = (rand(10) - 5) * 1.2;
    }
  }
  return bolt;
}
const at =
  (key: 'a' | 'b') =>
  (ms: number, out: Vector3): void => {
    const p = bolts(ms)[key];
    out.set(p[0], p[1], p[2]);
  };
const VIOLET = [0.6, 0.5, 0.8] as const;
const pulse: LookLight = (ms, _body, out) => {
  const l = Math.abs(Math.sin(ms * 0.0008)) * 0.8 + 0.2;
  out.set(l * 0.6, l * 0.5, l * 0.8);
};
const SHEETS = ['lightningMega1', 'lightningMega2', 'lightningMega3'] as const;
/** The bolt at `key`'s offset, one sprite per sheet: the frame's sheet drawn, the others at 0. */
const lightning = (bone: number, key: 'a' | 'b', size: () => number): HeldSprite[] =>
  SHEETS.map((texture, sheet) => ({
    texture,
    bone,
    offset: at(key),
    scale: ms => (bolts(ms).sheet === sheet ? size() : 0),
    light: [0.8, 0.8, 0.8],
    rotation: () => rand(380),
  }));

// MODEL_ABSOLUTE_SCEPTER carried (ZzzCharacter.cpp:7928-7969): a violet flare and a pulsing Shiny02 at Zx01
// (bone 3) and Zx02 (bone 4), each with a lightning bolt a few cm off. The original adds the offsets in
// world space; here they are in the bone's frame, the same random jitter.
export default defineItemLook({
  items: [[2, 17]],
  held: [
    { texture: 'flare01', bone: 3, scale: ms => Math.floor(roll(ms, 0) * 10) / 10 + 1, light: VIOLET },
    { texture: 'shiny02', bone: 3, scale: 0.5, light: pulse },
    ...lightning(3, 'a', () => (rand(11) - 20) / 100 + 0.5),
    { texture: 'flare01', bone: 4, scale: ms => Math.floor(roll(ms, 1) * 10) / 5 + 1.5, light: VIOLET },
    { texture: 'shiny02', bone: 4, scale: 1, light: pulse },
    ...lightning(4, 'b', () => (rand(11) - 20) / 50 + 0.8),
  ],
});
