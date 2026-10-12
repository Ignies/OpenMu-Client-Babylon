import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const GREY = [0.6, 0.6, 0.6] as const;
const sprite = (texture: HeldSprite['texture'], scale: HeldSprite['scale'], offset?: readonly [number, number, number]): HeldSprite => ({
  texture,
  bone: 2,
  offset,
  scale,
  light: GREY,
});

// MODEL_DAYBREAK carried (ZzzCharacter.cpp:7224-7254): two Impack03 either side of bone 2, a Shiny02 and a
// turning one of random size on it, and a big flare flickering grey.
export default defineItemLook({
  items: [[0, 24]],
  held: [
    sprite('impact03', 0.45, [0, 0, 3]),
    sprite('impact03', 0.45, [0, 0, -3]),
    sprite('shiny02', 0.7),
    { ...sprite('shiny02', () => 0.5 + Math.floor(Math.random() * 100) / 180), rotation: ms => ms * 0.0006 * 360 },
    {
      texture: 'flare01',
      bone: 2,
      scale: 3,
      light: (ms, _body, out) => out.setAll(Math.sin(ms * 0.4) * 0.25 + 0.6),
    },
  ],
});
