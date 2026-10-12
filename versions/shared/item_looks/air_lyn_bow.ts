import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';
import { PlayerAction } from '@versions/shared/objects/enum';

const GREEN = [0.2, 0.8, 0.5] as const;

/** A quarter turn by `int(WorldTime * rate) % mod + add` degrees: the shock wave grows as it fades. */
const angle = (ms: number, rate: number, mod: number, add: number) => (Math.PI / 180) * ((Math.floor(ms * rate) % mod) + add);
const wave = (rate: number, mod: number, add: number): Pick<HeldSprite, 'scale' | 'light'> => ({
  scale: ms => Math.abs(Math.sin(angle(ms, rate, mod, add))) * 0.3,
  light: (ms, _body, out) => {
    const theta = Math.abs(Math.sin(angle(ms, rate, mod, add) + Math.PI / 2));
    out.set(GREEN[0] * theta, GREEN[1] * theta, GREEN[2] * theta);
  },
});

/** `IsAttackAction`: PLAYER_ATTACK_FIST .. PLAYER_RIDE_SKILL (PlayerActionState.h:13). */
const attacking = (w: { action: number }) => w.action >= PlayerAction.PLAYER_ATTACK_FIST && w.action <= PlayerAction.PLAYER_RIDE_SKILL;

// MODEL_AIR_LYN_BOW carried (ZzzCharacter.cpp:8345-8385): two flares and two pulsing shock waves on bones
// 7 and 11; while attacking, Flare on bones 22-29.
export default defineItemLook({
  items: [[4, 24]],
  held: [
    ...[7, 11].flatMap((bone): HeldSprite[] => [
      { texture: 'flare01', bone, scale: 0.8, light: GREEN },
      { texture: 'flare01', bone, scale: 0.8, light: GREEN },
      { texture: 'shockWave', bone, ...wave(0.02, 90, 0) },
      { texture: 'shockWave', bone, ...wave(0.05, 60, 30) },
    ]),
    ...[22, 23, 24, 25, 26, 27, 28, 29].map((bone): HeldSprite => ({ texture: 'flare', bone, scale: 0.4, light: GREEN, when: attacking })),
  ],
});
