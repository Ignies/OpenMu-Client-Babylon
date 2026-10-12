import { defineItemLook, frameRolls, randomTurn } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const roll = frameRolls();
/** The frame's `rand() % 30 / 300`, shared by every mark. */
const size = (ms: number) => Math.floor(roll(ms, 0) * 30) / 300 + 0.3;

// The Phoenix Soul Star's wing (MODEL_SWORD_35_WING, MonkSystem.cpp:245) carried (ZzzCharacter.cpp:8386-8401):
// green light marks at a random turn on bones 3-10 and 13-20.
export default defineItemLook({
  items: [[0, 35]],
  wing: [3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20].map(
    (bone): HeldSprite => ({ texture: 'lightmarks', bone, scale: size, light: [0.18, 0.45, 0.22], rotation: randomTurn })
  ),
});
