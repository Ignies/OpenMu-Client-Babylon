import { describe, expect, it } from 'vitest';
import { PBR_LOOKS_METAL_GLSL, pbrLooksGlsl, surfaceVector } from './pbrLooks';
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
