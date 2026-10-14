import { describe, expect, it } from 'vitest';
import { PBR_LOOKS_METAL_GLSL, lookValues, pbrLooksGlsl, surfaceVector } from './pbrLooks';
import {
  SURFACE_CLOTH,
  SURFACE_GEAR,
  SURFACE_NONE,
  SURFACE_SKIN,
} from '../render/surfaceClass';

describe('surfaceVector', () => {
  it.each([
    [SURFACE_GEAR, true, [1, 0, 0, 1]],
    [SURFACE_CLOTH, true, [0, 1, 0, 1]],
    [SURFACE_SKIN, true, [0, 0, 1, 1]],
    [SURFACE_NONE, true, [0, 0, 0, 1]],
    [undefined, false, [0, 0, 0, 0]],
  ] as const)('surface %s, character %s', (surface, character, expected) => {
    expect(surfaceVector(surface, character, [9, 9, 9, 9])).toEqual(expected);
  });
});

describe('the looks GLSL', () => {
  // A ';' in a GLSL comment breaks Babylon's shader processor; the looks carry no comments at all.
  it('has no comments', () => {
    expect(PBR_LOOKS_METAL_GLSL + pbrLooksGlsl('muDetail')).not.toMatch(/\/\/|\/\*/);
  });
});

describe('lookValues', () => {
  it('maps the option defaults onto the tuned look', () => {
    const v = lookValues(
      {
        materialMetal: 8,
        materialPlate: 8,
        materialRoughness: 3,
        materialSheen: 5,
        materialSkin: 5,
        materialRim: 3,
        materialGround: 2,
        materialSky: 7,
      },
      [0, 0, 0, 0, 0, 0, 0, 0]
    );

    expect(v.map(n => +n.toFixed(3))).toEqual([0.8, 0.8, 0.3, 0.5, 1, 0.15, 0.1, 0.7]);
  });

  it('keeps a floor under roughness so slider 0 is a mirror, not a broken highlight', () => {
    const zero = { materialMetal: 0, materialPlate: 0, materialRoughness: 0, materialSheen: 0, materialSkin: 0, materialRim: 0, materialGround: 0, materialSky: 0 };

    expect(lookValues(zero, [0, 0, 0, 0, 0, 0, 0, 0])[2]).toBe(0.05);
  });
});
