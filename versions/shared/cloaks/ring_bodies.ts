import {
  PCT_CURVED,
  PCT_ELASTIC_HALLOWEEN,
  PCT_MASK_ALPHA,
  PCT_SHAPE_HALLOWEEN,
  PCT_SHORT_SHOULDER,
  type ClothSpec,
} from '@/controllers/cloth';

/** A body that carries cloths of its own: built on the wearer's set once, each drawn or not, held by stun or not. */
type BodyCloths = { readonly cloths: readonly ClothSpec[]; readonly drawn: boolean; readonly holds: boolean };

/** `MODEL_CURSEDTEMPLE_ALLIED_PLAYER`'s (`unitedsoldier`): `skill\unitedsoldier_wing.tga` from the neck (ZzzObject.cpp:8174-8203). */
const UNITED_SOLDIER: BodyCloths = {
  cloths: [
    {
      bone: 19,
      at: [0, 8, 0],
      grid: [10, 10],
      size: [140, 140],
      front: 'Skill/unitedsoldier_wing.OZT',
      back: 'Skill/unitedsoldier_wing.OZT',
      flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_MASK_ALPHA,
    },
  ],
  drawn: true,
  holds: true,
};

/** `MODEL_CURSEDTEMPLE_ILLUSION_PLAYER`'s (`illusionist`): `skill\illusionistcloth.tga` from the head (:8230-8259). */
const ILLUSIONIST: BodyCloths = {
  cloths: [
    {
      bone: 20,
      at: [-4, 5, 0],
      grid: [10, 20],
      size: [17, 100],
      front: 'Skill/illusionistcloth.OZT',
      back: 'Skill/illusionistcloth.OZT',
      flags: PCT_SHAPE_HALLOWEEN | PCT_ELASTIC_HALLOWEEN | PCT_MASK_ALPHA,
    },
  ],
  drawn: true,
  holds: true,
};

/** `MODEL_HALLOWEEN`'s (`jack`): `Monster\iui02.tga` (BITMAP_ROBE + 3) from the neck, never held (:8397-8416). */
const JACK: BodyCloths = {
  cloths: [
    {
      bone: 19,
      at: [0, 10, 0],
      grid: [10, 20],
      size: [30, 200],
      front: 'Monster/iui02.OZT',
      back: 'Monster/iui02.OZT',
      flags: PCT_SHAPE_HALLOWEEN | PCT_ELASTIC_HALLOWEEN | PCT_MASK_ALPHA,
    },
  ],
  drawn: true,
  holds: false,
};

/** The game master's (`MODEL_GM_CHARACTER`, `youngza`) hair over the upper back (ZzzCharacter.cpp:9464-9482). */
const BACK = [
  [-10, 20, 20, 27, 17],
  [10, 20, 20, 27, 17],
] as const;
const GAME_MASTER: BodyCloths = {
  cloths: [
    { bone: 20, at: [0, 5, 10], grid: [6, 5], size: [30, 70], front: 'Skill/younghtest1.OZT', back: 'Skill/younghtest1.OZT', flags: PCT_SHORT_SHOULDER | PCT_MASK_ALPHA, wind: [10, 20], spheres: BACK },
    { bone: 20, at: [0, 5, 25], grid: [4, 4], size: [30, 40], front: 'Skill/younghtest3.OZT', back: 'Skill/younghtest3.OZT', flags: PCT_SHORT_SHOULDER | PCT_MASK_ALPHA, wind: [8, 15], spheres: BACK },
  ],
  // Stepped and drawn only `if (g_isCharacterBuff(o, eBuff_Cloaking))` inside `if (!g_isCharacterBuff(o, eBuff_Cloaking))` (:9440, :9486).
  drawn: false,
  holds: true,
};

/** By the body's part file (the wearer's `skin`): the rings' bodies whose `RenderPartObjectBody` hangs a cloth. */
const BY_SKIN = new Map<string, BodyCloths>([
  ['unitedsoldier.glb', UNITED_SOLDIER],
  ['illusionist.glb', ILLUSIONIST],
  ['jack.glb', JACK],
  ['youngza.glb', GAME_MASTER],
]);

/** The cloths a ring's body worn on the rig carries, else null. */
export const bodyCloths = (skin: string | null): BodyCloths | null => (skin === null ? null : (BY_SKIN.get(skin) ?? null));
