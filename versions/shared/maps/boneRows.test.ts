import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** Table rows the original hangs on a bone, `TransformPosition(BoneTransform[n], ...)`. */
const ON_BONES: readonly [ENUM_WORLD, number, string][] = [
  [ENUM_WORLD.WD_3NORIA, 1, 'ZzzObject.cpp:2833-2841'],
  [ENUM_WORLD.WD_3NORIA, 9, 'ZzzObject.cpp:2823-2827'],
  [ENUM_WORLD.WD_3NORIA, 17, 'ZzzObject.cpp:2842-2852'],
  [ENUM_WORLD.WD_3NORIA, 35, 'ZzzObject.cpp:2828-2832'],
  [ENUM_WORLD.WD_3NORIA, 39, 'ZzzObject.cpp:2853-2884'],
  [ENUM_WORLD.WD_10ICARUS, 10, 'ZzzObject.cpp:3127-3134'],
  [ENUM_WORLD.WD_24HELLAS, 12, 'GMHellas.cpp:439-446'],
  [ENUM_WORLD.WD_31HUNTING_GROUND, 49, 'GMHuntingGround.cpp:143-155'],
  [ENUM_WORLD.WD_33AIDA, 30, 'GMAida.cpp:106-150'],
  [ENUM_WORLD.WD_33AIDA, 75, 'GMAida.cpp:304-311'],
  [ENUM_WORLD.WD_37KANTURU_1ST, 70, 'GM_Kanturu_1st.cpp:175-186'],
  [ENUM_WORLD.WD_38KANTURU_2ND, 4, 'GM_Kanturu_2nd.cpp:335-346'],
  [ENUM_WORLD.WD_38KANTURU_2ND, 8, 'GM_Kanturu_2nd.cpp:347-355'],
  [ENUM_WORLD.WD_39KANTURU_3RD, 5, 'GM_Kanturu_3rd.cpp:262-272'],
  [ENUM_WORLD.WD_51ELBELAND, 63, 'GMNewTown.cpp:289-300'],
  [ENUM_WORLD.WD_51ELBELAND, 110, 'GMNewTown.cpp:301-311'],
  [ENUM_WORLD.WD_51ELBELAND, 121, 'GMNewTown.cpp:312-327'],
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE, 30, 'GMUnitedMarketPlace.cpp:92-108, :248-263'],
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE, 35, 'GMUnitedMarketPlace.cpp:110-127, :264-275'],
  [ENUM_WORLD.WD_80KARUTAN1, 72, 'GMKarutan1.cpp:83-99'],
];

describe('rows that stand for a bone', () => {
  // The bone transforms carry `BodyScale` (ZzzBMD.cpp:168-180): the row grows with its object.
  it('grow with their object', () => {
    for (const [world, type, where] of ON_BONES) {
      const rows = lightEmittersFor(world, type) ?? [];
      expect(rows.length, where).toBeGreaterThan(0);
      expect(rows.filter(e => e.offset && !e.bone).map(e => e.offset), `world ${world} type ${type} (${where})`).toEqual([]);
    }
  });

  // `TransformPosition(BoneTransform[0], (orbit, 70), ...)`: bone 0 sits 39 under the shrine's origin.
  it('Elbeland 110: the shrine light rides bone 0, 31 up (GMNewTown.cpp:301-311)', () => {
    expect(lightEmittersFor(ENUM_WORLD.WD_51ELBELAND, 110)?.map(e => e.offset)).toEqual([[0, 0, 31]]);
  });

  // A row cannot follow a moving bone: Noria's lanterns swing up to 25 across, its street lamp bobs 21.
  it('sit at the middle of an animated bone\'s motion', () => {
    const offsets = (type: number) => lightEmittersFor(ENUM_WORLD.WD_3NORIA, type)?.map(e => e.offset);
    expect(offsets(9)).toEqual([[-1, 0, 189]]);
    expect(offsets(17)).toEqual([[53, -13, 284], [116, 3, 285], [154, -5, 280], [207, -5, 280]]);
  });
});
