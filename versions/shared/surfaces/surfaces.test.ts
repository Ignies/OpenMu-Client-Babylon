import { describe, expect, it } from 'vitest';
import {
  SURFACE_CLOTH,
  SURFACE_GEAR,
  SURFACE_NONE,
  SURFACE_SKIN,
  surfaceOf,
} from '@/controllers/render/surfaceClass';
import './index';

describe('surface classes', () => {
  it.each([
    ['Player/ArmorMale10.glb', SURFACE_GEAR, 'Plate Armor'],
    ['Player/HelmMale06.glb', SURFACE_GEAR, 'Leather Helm'],
    ['Player/ArmorMale03.glb', SURFACE_CLOTH, 'Pad Armor'],
    ['Player/ArmorElf01.glb', SURFACE_CLOTH, 'Vine Armor'],
    ['Player/ArmorMale41.glb', SURFACE_CLOTH, 'Red Wing Armor'],
    ['Item/Sword01.glb', SURFACE_GEAR, 'Kris'],
    ['Player/ArmorClass01.glb', SURFACE_SKIN, 'a bare class body'],
    ['Player/SkinClass106.glb', SURFACE_SKIN, 'a bare class body'],
    ['Item/Wing01.glb', SURFACE_NONE, 'wings'],
    ['Monster/Monster01.glb', SURFACE_NONE, 'a monster'],
  ])('%s is %i (%s)', (path, surface) => {
    expect(surfaceOf(path)).toBe(surface);
  });
});
