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
};

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
