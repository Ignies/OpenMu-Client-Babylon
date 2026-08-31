import { Matrix } from '../libs/babylon/exports';
import type { Item } from '../ecs/world';
import { angleLinkMatrix, type BmdLink } from './boneLink';

/**
 * The wing part (`c->Wing`) as the original renders it — `RenderCharacterBackItem`
 * ZzzCharacter.cpp:15100-15142, the per-type passes in `ItemObjectAttribute`
 * (ZzzObject.cpp:5151-5299) and `RenderPartObjectBody` (:6851-6890), and the
 * bone auras in `RenderPartObjectEffect` (:9860-9925).
 *
 * Item groups: wings are group 12 (`ITEM_WING`), the Dark Lord capes group 13.
 * `MODEL_WING + n` in the C++ is exactly `{ group: 12, num: n }` here, so the
 * indices below are the C++ enum offsets (_enum.h:1918-1956).
 *
 * **Not ported, because the original assigns them and then never reads them:**
 * the Wings of Soul / Wings of Dragon `BlendMeshLight` sines (:9816-9822) and
 * the Wings of Spirits `o->Scale = 0.5` (:5277). Both land on the shared
 * `g_ItemObject[Type]` whose `BlendMesh` is -1 and whose `Scale` is overwritten
 * by `b->BodyScale = o->Scale` from the wearer, so neither reaches the screen.
 */

export const WING_GROUP = 12;
export const HELPER_GROUP = 13;

/** `w->LinkBone = 47` — the default back bone every wing hangs from. */
export const WING_BONE = 47;
/** Capes link to bone 19 instead (`RenderCharacterBackItem`:15132). */
export const CAPE_BONE = 19;

/** Wing indices in group 12 the code below refers to by name. */
export const WING_OF_ELF = 0;
export const WINGS_OF_HEAVEN = 1;
export const WINGS_OF_SATAN = 2;
export const WINGS_OF_SPIRITS = 3;
export const WINGS_OF_SOUL = 4;
export const WINGS_OF_DRAGON = 5;
export const WINGS_OF_DARKNESS = 6;
export const WING_OF_STORM = 36;
export const WING_OF_ETERNAL = 37;
export const WING_OF_ILLUSION = 38;
export const WING_OF_RUIN = 39;
export const CAPE_OF_EMPEROR = 40;
export const WING_OF_CURSE = 41;
export const WINGS_OF_DESPAIR = 42;
export const WING_OF_DIMENSION = 43;

/** Cape of Lord lives in the helper group (13). */
export const CAPE_OF_LORD = 30;

/** A bone-anchored particle aura the wing emits (`RenderPartObjectEffect`). */
export type WingWake = {
  readonly kind: 'wingFlareBlue' | 'wingCloud';
  /** Bone indices the sprites are placed on. */
  readonly bones: readonly number[];
  /** Sprite scale at `timeMs`. */
  readonly scale: (timeMs: number) => number;
  /** Sprite colour at `timeMs`. */
  readonly light: (timeMs: number) => readonly [number, number, number];
  /** Emit every n-th 25 Hz tick (the original re-creates them every frame). */
  readonly every: number;
};

export type WingSpec = {
  /** `o->BlendMesh`: the mesh drawn as an additive glow card. -1 = none. */
  readonly blendMesh: number;
  /** `f->PlaySpeed` override that wins over the fly/idle rule. */
  readonly playSpeed?: number;
  /** `f->PlaySpeed` while a FLY clip is running (Wing of Storm halves it). */
  readonly flyPlaySpeed?: number;
  /** Capes are link-bound to bone 19 with an explicit matrix. */
  readonly cape?: 'emperor' | 'overrule';
  /**
   * Clip to play inside a safe zone instead of clip 0 — the Wings of Darkness
   * fold shut in town (`RenderLinkObject`, ZzzCharacter.cpp:6785).
   */
  readonly safeZoneAction?: number;
  readonly wake?: WingWake;
};

const PLAIN: WingSpec = { blendMesh: -1 };

/**
 * `RenderLinkObject`'s cape matrices (ZzzCharacter.cpp:6524-6538), in BMD
 * bone space: Cape of Overrule `AngleMatrix(0,90,0) + (10,-15,0)`, every
 * cape at or above Cape of Emperor `AngleMatrix(0,90,0) + (-47,-7,0)`.
 */
const CAPE_LINKS: Record<'emperor' | 'overrule', BmdLink> = {
  emperor: { angle: [0, 90, 0], offset: [-47, -7, 0] },
  overrule: { angle: [0, 90, 0], offset: [10, -15, 0] },
};

const WINGS: Readonly<Record<number, WingSpec>> = {
  // --- 1st level. `case MODEL_WING: o->BlendMesh = 0` (ZzzObject.cpp:5284).
  [WING_OF_ELF]: { blendMesh: 0 },
  [WINGS_OF_HEAVEN]: PLAIN,
  [WINGS_OF_SATAN]: PLAIN,

  // --- 2nd level.
  [WINGS_OF_SPIRITS]: { blendMesh: 0 }, // ZzzObject.cpp:5276
  [WINGS_OF_SOUL]: PLAIN,
  [WINGS_OF_DRAGON]: PLAIN,
  [WINGS_OF_DARKNESS]: {
    blendMesh: -1,
    safeZoneAction: 1,
    wake: {
      kind: 'wingFlareBlue',
      // The two five-bone runs of ZzzObject.cpp:9868-9890 (`22 - i`, `7 - i`).
      bones: [22, 21, 20, 19, 18, 7, 6, 5, 4, 3],
      // Scale = (sinf(WorldTime*0.004)*0.3 + 0.3) * 10 + 20, drawn at /28.
      scale: t => ((Math.sin(t * 0.004) * 0.3 + 0.3) * 10 + 20) / 28,
      light: () => [0.6, 0.3, 0.8],
      every: 2,
    },
  },

  // --- 3rd level.
  [WING_OF_STORM]: {
    blendMesh: -1,
    flyPlaySpeed: 0.5, // ZzzCharacter.cpp:15115
    wake: {
      kind: 'wingCloud',
      // The 25-bone table of ZzzObject.cpp:9903-9906.
      bones: [
        9, 20, 19, 10, 18, 28, 27, 36, 35, 38, 37, 53, 48, 62, 70, 72, 71, 78,
        79, 80, 87, 90, 91, 106, 102,
      ],
      scale: () => 0.5,
      light: t => {
        const l = 0.5 + Math.abs(Math.sin(t * 0.0004)) * 0.4;
        return [l, l, l];
      },
      every: 3,
    },
  },
  [WING_OF_ETERNAL]: PLAIN,
  [WING_OF_ILLUSION]: PLAIN,
  [WING_OF_RUIN]: {
    blendMesh: -1,
    playSpeed: 0.15, // RenderLinkObject, ZzzCharacter.cpp:6477-6481
  },
  [CAPE_OF_EMPEROR]: { blendMesh: -1, cape: 'emperor' },
  [WING_OF_CURSE]: PLAIN,
  [WINGS_OF_DESPAIR]: PLAIN,
  [WING_OF_DIMENSION]: PLAIN,
};

const CAPES: Readonly<Record<number, WingSpec>> = {
  [CAPE_OF_LORD]: { blendMesh: -1, cape: 'emperor' },
};

/** True for the items the appearance's wing slot can legitimately hold. */
export function isWingItem(item: Item | null | undefined): item is Item {
  return wingSpec(item) !== null;
}

export function wingSpec(item: Item | null | undefined): WingSpec | null {
  if (!item) return null;
  if (item.group === WING_GROUP) return WINGS[item.num] ?? null;
  if (item.group === HELPER_GROUP) return CAPES[item.num] ?? null;
  return null;
}

/** The link matrix a cape needs, or null for a plain bone-47 wing. */
export function wingLinkMatrix(spec: WingSpec | null): Matrix | null {
  if (!spec?.cape) return null;
  return angleLinkMatrix(CAPE_LINKS[spec.cape]);
}

export function wingBone(spec: WingSpec | null): number {
  return spec?.cape ? CAPE_BONE : WING_BONE;
}

/**
 * Wings that move a character at 16 rather than 15 units
 * (`CharacterMoveSpeed`, ZzzCharacter.cpp:6205).
 */
export function isFastWing(item: Item | null | undefined): boolean {
  return (
    !!item &&
    item.group === WING_GROUP &&
    (item.num === WINGS_OF_DRAGON || item.num === WING_OF_STORM)
  );
}
