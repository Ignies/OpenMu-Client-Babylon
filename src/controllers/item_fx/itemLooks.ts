import type { Vector3 } from '../render/babylon/exports';
import type { MeshPass, MeshPassSet } from '../render/meshPasses';
import type { HeldTexture } from '../fx/effectParticles';
import { legacyItemEffectsOn } from './itemEffectMode';

export type { MeshPass } from '../render/meshPasses';

/** A light written into `out` at `ms` (`WorldTime`) from the body's (`body`). */
export type LookLight = (ms: number, body: Vector3, out: Vector3) => void;

/**
 * One `CreateSprite` the original issues every frame for a held weapon (`RenderLinkObject`,
 * ZzzCharacter.cpp:7027-8386): a sheet at a point of the weapon model, re-placed each frame.
 */
export type HeldSprite = {
  readonly texture: HeldTexture;
  /** The weapon model's bone (`BoneTransform[bone]`); the model's origin when it has no skeleton. */
  readonly bone: number;
  /** A point in that bone's frame, in the original's units (cm); a function moves it each frame. */
  readonly offset?: readonly [number, number, number] | ((ms: number, out: Vector3) => void);
  readonly scale: number | ((ms: number) => number);
  /** The sprite's light; `body` is the wearer's (`o->Light`). */
  readonly light: readonly [number, number, number] | LookLight;
  /** Degrees. */
  readonly rotation?: (ms: number) => number;
  /** Drawn only while this holds for the wearer (an action or `c->SafeZone` test); omitted = always. */
  readonly when?: (wearer: HeldWearer) => boolean;
};

/** What a held sprite may ask of the character carrying it: `o->CurrentAction`, `c->SafeZone`. */
export type HeldWearer = { action: number; safeZone: boolean };

/**
 * One item's own look beyond its model, as content declares it (`versions/shared/item_looks/`):
 * `body` is its `RenderPartObjectBody` branch (ZzzObject.cpp:6890-8920), drawn worn, on the ground
 * and in the bag; `held`, the sprites `RenderLinkObject` puts on it while a character carries it.
 * Both belong to the original's passes, so they follow the Item effects option.
 */
export type ItemLook = {
  /** `[group, index]` of every item the look is for (an armour set names its pieces). */
  readonly items: readonly (readonly [number, number])[];
  readonly body?: { readonly passes: readonly MeshPass[]; readonly drawn?: readonly number[] };
  readonly held?: readonly HeldSprite[];
};

export const defineItemLook = (look: ItemLook): ItemLook => look;

/** A light the original sets outright (`Vector(r, g, b, b->BodyLight)`), whatever the body's. */
export const fixedLight =
  (r: number, g: number, b: number): LookLight =>
  (_ms, _body, out) => {
    out.set(r, g, b);
  };

/** Chrome01 on the normal look-up: RENDER_CHROME with no texture of its own (ZzzBMD.cpp:1478). */
export const CHROME01 = { texture: 'Effect/Chrome01.OZJ', map: 'chrome' } as const;

/** RenderLinkObject's `Luminosity = (rand() % 30 + 70) * 0.005f`, rolled once a frame (ZzzCharacter.cpp:7029). */
const luminosity = { ms: -1, value: 0 };
export function heldLuminosity(ms: number): number {
  if (luminosity.ms !== ms) {
    luminosity.ms = ms;
    luminosity.value = (Math.floor(Math.random() * 30) + 70) * 0.005;
  }
  return luminosity.value;
}

/** `Vector(Luminosity * r, Luminosity * g, Luminosity * b, Light)` on the frame's roll. */
export const luminous =
  (r: number, g: number, b: number): LookLight =>
  (ms, _body, out) => {
    const l = heldLuminosity(ms);
    out.set(l * r, l * g, l * b);
  };

/** The frame's `rand()` rolls in [0, 1): `roll(ms, k)` is the k-th, the same for every sprite read that frame. */
export function frameRolls(): (ms: number, k: number) => number {
  let at = -1;
  const values: number[] = [];
  return (ms, k) => {
    if (at !== ms) {
      at = ms;
      values.length = 0;
    }
    return (values[k] ??= Math.random());
  };
}

/** `rand() % 360`, rolled each frame: a sprite's random turn. */
export const randomTurn = (): number => Math.floor(Math.random() * 360);

/** A sprite drawn at `scale` on the frames `rand_fps_check(n)` passes (one in n), else at 0. */
export const oneIn =
  (n: number, scale: number) =>
  (): number =>
    Math.random() * n < 1 ? scale : 0;

const bodies = new Map<number, MeshPassSet>();
const helds = new Map<number, readonly HeldSprite[]>();
const key = (group: number, num: number) => group * 512 + num;

/** Content's looks, handed in at boot; a later look for the same item replaces the earlier one. */
export function registerItemLooks(looks: readonly ItemLook[]): void {
  for (const look of looks) {
    const set: MeshPassSet | null = look.body ? { ...look.body, shown: legacyItemEffectsOn } : null;
    for (const [group, num] of look.items) {
      if (set) bodies.set(key(group, num), set);
      if (look.held) helds.set(key(group, num), look.held);
    }
  }
}

/** The passes the item's model draws over its lit body, or null. */
export function itemBodyPasses(group: number, num: number): MeshPassSet | null {
  return bodies.get(key(group, num)) ?? null;
}

/** The sprites a character carrying the item draws on it, or null. */
export function itemHeldSprites(group: number, num: number): readonly HeldSprite[] | null {
  return helds.get(key(group, num)) ?? null;
}
