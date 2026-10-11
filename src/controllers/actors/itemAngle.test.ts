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

describe('itemRestPose, ItemAngle tail', () => {
  it('lays wings down instead of standing them up', () => {
    // `Type >= MODEL_WING && Type < MODEL_WING + MAX_ITEM_INDEX`, the branch
    // that used to fall through to the default upright pose.
    expect(itemRestPose(ItemGroup.Wing, 0).angle).toEqual([270, 0, 45]); // Wings of Fairy
    expect(itemRestPose(ItemGroup.Wing, 3).angle).toEqual([270, 0, 45]); // Wings of Spirit
    expect(itemRestPose(ItemGroup.Wing, 3).scale).toBe(0.8);
  });

  it('keeps the earlier wing-group rows ahead of that catch-all', () => {
    // Seed of Fire: `MODEL_SEED_FIRE .. MODEL_SEED_EARTH`, upright at 0.6.
    expect(itemRestPose(ItemGroup.Wing, 60)).toEqual({ angle: [0, 0, -45], scale: 0.6 });
    // Cape of Fighter is handled before the whole chain (ItemAngleRF).
    expect(itemRestPose(ItemGroup.Wing, 49)).toEqual({ angle: [270, 180, 45], scale: 0.7 });
  });

  it('lays the quest and jewel drops flat', () => {
    expect(itemRestPose(ItemGroup.Potion, 16)).toEqual({ angle: [270, 0, 45], scale: 0.8 }); // Jewel of Life
    expect(itemRestPose(ItemGroup.Potion, 42)).toEqual({ angle: [270, 0, -15], scale: 1.3 }); // Jewel of Harmony
    expect(itemRestPose(ItemGroup.Etc, 19)).toEqual({ angle: [270, 0, -45], scale: 0.8 }); // Chain Lightning scroll
  });

  it('turns the ones the original only yaws', () => {
    expect(itemRestPose(ItemGroup.Potion, 25).angle).toEqual([0, 0, 45]); // Tear of Elf
    expect(itemRestPose(ItemGroup.Helper, 21).angle).toEqual([0, 0, 20]); // Ring of Fire
    expect(itemRestPose(ItemGroup.Helper, 37).angle).toEqual([0, 0, 180]); // Horn of Fenrir
  });

  it('splits the two scales inside the Daemon branch', () => {
    expect(itemRestPose(ItemGroup.Helper, 64)).toEqual({ angle: [0, 0, 70], scale: 0.21 });
    expect(itemRestPose(ItemGroup.Helper, 65)).toEqual({ angle: [0, 0, 70], scale: 0.5 });
  });

  it('leaves an item the table does not name at the default pose', () => {
    expect(itemRestPose(ItemGroup.Potion, 15)).toEqual({ angle: [0, 0, -45], scale: 0.8 }); // Zen
    expect(itemRestPose(ItemGroup.Etc, 0)).toEqual({ angle: [0, 0, -45], scale: 0.8 });
  });
});
