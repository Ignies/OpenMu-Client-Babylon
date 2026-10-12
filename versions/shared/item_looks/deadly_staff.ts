import { defineItemLook, fixedLight, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import { energyTrail } from './imperial_sword';

const roll = frameRolls();
const ember: LookLight = (ms, _body, out) => {
  const l = Math.abs(Math.sin(ms * 0.001)) * 0.8 + 0.2;
  out.set(l * 0.8, l * 0.1, l * 0.3);
};
const red = (bone: number): HeldSprite[] => [
  { texture: 'flare01', bone, scale: 2, light: ember },
  { texture: 'shiny05', bone, scale: ms => Math.floor(roll(ms, 0) * 10) / 20 + 0.8, light: [0.8, 0.2, 0.4] },
];

// MODEL_DEADLY_STAFF (ZzzObject.cpp:7135-7142): the body lit, mesh 1 again as the blend mesh in pink.
// Carried (ZzzCharacter.cpp:7998-8034): orange flares on bones 4-9, a pulsing red flare and shiny05 at
// the gems (2 and 3), a red energy trail (SubType 47) off the second.
export default defineItemLook({
  items: [[5, 30]],
  emit: [energyTrail(3, [0.9, 0, 0], 25)],
  body: { passes: [{ mesh: 1, kind: 'add', light: fixedLight(1, 0.5, 0.5) }] },
  held: [
    ...[0.8, 0.4, 0.8, 0.8, 2, 0.8].map((scale, i): HeldSprite => ({ texture: 'flare01', bone: i + 4, scale, light: [0.8, 0.3, 0.1] })),
    ...red(2),
    ...red(3),
  ],
});
