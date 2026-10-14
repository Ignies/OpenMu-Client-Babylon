import { afterEach, describe, expect, it } from 'vitest';
import {
  SURFACE_CLOTH,
  SURFACE_GEAR,
  SURFACE_NONE,
  modelKey,
  registerSurfaces,
  surfaceOf,
} from './surfaceClass';

afterEach(() => registerSurfaces(() => undefined));

describe('modelKey', () => {
  it.each([
    ['Player/ArmorMale10.glb', 'player/armormale10'],
    ['/Data/Player/ArmorMale10.glb', 'player/armormale10'],
    ['Data\\Item\\Sword01.GLB', 'item/sword01'],
    ['Sword01.glb', 'sword01'],
  ])('%s -> %s', (path, key) => expect(modelKey(path)).toBe(key));
});

describe('surfaceOf', () => {
  it('is none until content registers a rule', () => {
    expect(surfaceOf('Player/ArmorMale10.glb')).toBe(SURFACE_NONE);
  });

  it('asks the registered rule by model key and falls back to none', () => {
    registerSurfaces(key =>
      key === 'player/armormale10' ? SURFACE_GEAR : key === 'player/armormale03' ? SURFACE_CLOTH : undefined
    );

    expect(surfaceOf('/Data/Player/ArmorMale10.glb')).toBe(SURFACE_GEAR);
    expect(surfaceOf('Player/ArmorMale03.glb')).toBe(SURFACE_CLOTH);
    expect(surfaceOf('Monster/Goblin.glb')).toBe(SURFACE_NONE);
  });
});
