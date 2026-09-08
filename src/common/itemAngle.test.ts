import { describe, expect, it } from 'vitest';
import { ItemGroup, itemRestPose, itemWornHeight } from './itemAngle';

describe('itemRestPose', () => {
  it('scales an ordinary drop to 0.8', () => {
    expect(itemRestPose(ItemGroup.Sword, 0).scale).toBe(0.8);
    expect(itemRestPose(ItemGroup.Shield, 0).scale).toBe(0.8);
    expect(itemRestPose(ItemGroup.Helm, 5).scale).toBe(0.8);
    expect(itemRestPose(ItemGroup.Potion, 15).scale).toBe(0.8);
  });

  it('scales the spear to Platina Staff band to 0.7', () => {
    expect(itemRestPose(ItemGroup.Spear, 0).scale).toBe(0.7);
    expect(itemRestPose(ItemGroup.Bow, 0).scale).toBe(0.7);
    expect(itemRestPose(ItemGroup.Staff, 13).scale).toBe(0.7);
    // Past the Platina Staff the band ends.
    expect(itemRestPose(ItemGroup.Staff, 14).scale).toBe(0.8);
  });

  it('keeps the scales ItemAngle sets itself', () => {
    // Divine Sword of Archangel, the oversized helms, a parchment.
    expect(itemRestPose(ItemGroup.Sword, 19).scale).toBe(0.7);
    expect(itemRestPose(ItemGroup.Helm, 39).scale).toBe(1.5);
    expect(itemRestPose(ItemGroup.Etc, 30).scale).toBe(0.8);
  });

  it('still lies armour face-down and leaves a helm upright', () => {
    expect(itemRestPose(ItemGroup.Armor, 5).angle).toEqual([270, 0, -45]);
    expect(itemRestPose(ItemGroup.Helm, 5).angle).toEqual([0, 0, -45]);
  });
});

describe('itemWornHeight', () => {
  it('drops each body part by the height it is worn at', () => {
    expect(itemWornHeight(ItemGroup.Helm)).toBeCloseTo(-1.6);
    expect(itemWornHeight(ItemGroup.Armor)).toBeCloseTo(-1.0);
    expect(itemWornHeight(ItemGroup.Gloves)).toBeCloseTo(-0.7);
    expect(itemWornHeight(ItemGroup.Pants)).toBeCloseTo(-0.5);
  });

  it('leaves boots and everything that is not a body part where they are', () => {
    expect(itemWornHeight(ItemGroup.Boots)).toBe(0);
    expect(itemWornHeight(ItemGroup.Sword)).toBe(0);
    expect(itemWornHeight(ItemGroup.Potion)).toBe(0);
  });
});
