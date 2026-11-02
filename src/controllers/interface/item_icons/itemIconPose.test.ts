import { describe, expect, it } from 'vitest';
import { itemIconPose } from './itemIconPose';

/** The pose of item `group`/`num`, one-handed unless asked. */
const pose = (group: number, num: number, level = 0, twoHand = false) => itemIconPose(group, num, level, twoHand);
const angle = (group: number, num: number, level = 0, twoHand = false) => pose(group, num, level, twoHand).angle;
const offset = (group: number, num: number, level = 0) => pose(group, num, level).offset.map(v => Math.round(v * 1e6) / 1e6);
const anchor = (group: number, num: number, level = 0) => pose(group, num, level).anchor.map(v => Math.round(v * 1e6) / 1e6);

// RenderObjectScreen, ZzzInventory.cpp:7653-9026.
describe('the bag angle and offset: weapons', () => {
  it('a one-handed weapon leans 15 degrees, a two-handed one 25 (:7808-7815)', () => {
    expect(angle(0, 1)).toEqual([180, 270, 15]);
    expect(angle(2, 22)).toEqual([180, 270, 15]);
    expect(angle(0, 1, 0, true)).toEqual([180, 270, 25]);
  });

  it('the Kris has its own branch ahead of the swords (:7664)', () => {
    expect(angle(0, 0, 0, true)).toEqual([180, 270, 15]);
    expect(offset(0, 0)).toEqual([-0.02, 0.03, 0]);
  });

  it('the summoner sticks are nudged before they lean (:7801-7805)', () => {
    expect(offset(5, 14)).toEqual([0, 0.04, 0]);
    expect(offset(5, 19)).toEqual([-0.02, -0.02, 0]);
  });

  it('bows, crossbows, ammunition, books and shields', () => {
    expect(angle(4, 7)).toEqual([0, 270, 15]); // :7670 MODEL_BOLT
    expect(angle(4, 8)).toEqual([90, 180, 20]); // :7789 MODEL_CROSSBOW
    expect(angle(4, 17)).toEqual([0, 90, 15]); // :7679 MODEL_CELESTIAL_BOW
    expect(angle(5, 23)).toEqual([0, 0, 0]); // :7716 the books
    expect(angle(6, 4)).toEqual([270, 270, 0]); // :7817 every shield
  });

  it('the switch after the chains turns a few again (:8778-8827)', () => {
    expect(angle(5, 32)).toEqual([180, 90, 10]); // MODEL_STAFF + 32, the Merlin staff
    expect(angle(0, 26)).toEqual([180, 270, 10]);
    expect(offset(0, 26)).toEqual([-0.02, 0.04, 0]); // MODEL_FLAMBERGE
    expect(angle(5, 7)).toEqual([0, 0, 205]); // MODEL_CHAOS_LIGHTNING_STAFF
  });
});

describe('the bag angle and offset: armour', () => {
  it('a set no branch names, the Queen set, takes the default and its body height (:8887-8905)', () => {
    expect(angle(7, 53)).toEqual([270, -10, 0]);
    expect([7, 8, 9, 10, 11].map(group => pose(group, 53).bodyHeight)).toEqual([-160, -100, -50, -70, 0]);
  });

  it('the lucky sets sit lower still (:8891, :8898)', () => {
    expect(pose(7, 62).bodyHeight).toBe(-170);
    expect(pose(8, 72).bodyHeight).toBe(-113);
    expect(pose(9, 62).bodyHeight).toBe(-50);
  });

  it('named pieces and ranges', () => {
    expect(angle(7, 40)).toEqual([-90, 25, 0]); // :7752 MODEL_MISTERY_HELM .. MODEL_LILIUM_HELM
    expect(offset(7, 40)).toEqual([0, -0.05, 0]);
    expect(offset(8, 30)).toEqual([0, 0.1, 0]); // :7695 MODEL_VENOM_MIST_ARMOR
    expect(angle(7, 59)).toEqual([-90, 25, 0]); // :8689 MODEL_SACRED_HELM
    expect(offset(7, 65)).toEqual([0.04, 0, 0]); // :8892
  });
});

describe('the bag angle and offset: wings, orbs, seeds and jewels', () => {
  it('seeds, spheres and seed spheres (:8327-8338)', () => {
    expect(angle(12, 60)).toEqual([10, -10, 10]);
    expect(angle(12, 70)).toEqual([0, 0, 0]);
    expect(angle(12, 118)).toEqual([0, 0, 0]);
    expect(angle(12, 129)).toEqual([0, 0, 0]);
  });

  it('a wing no branch names keeps the default', () => {
    expect(angle(12, 26)).toEqual([270, -10, 0]);
    expect(offset(12, 26)).toEqual([0, 0, 0]);
  });

  it('the orbs are moved by the last switch (:8831)', () => {
    expect(offset(12, 8)).toEqual([0.005, -0.02, 0]);
  });

  it('the packed jewels: turned in the second chain, moved again by the scale chain (:8758-8776, :8943-8980)', () => {
    expect(angle(12, 142)).toEqual([270, -10, -45]);
    expect(offset(12, 142)).toEqual([-0.05, 0, 0]);
    expect(angle(12, 139)).toEqual([270, 90, 0]);
    expect(offset(12, 139)).toEqual([0, 0, 0]);
    expect(offset(12, 136)).toEqual([0, -0.025, 0]);
    expect(angle(12, 30)).toEqual([270, -10, 0]);
  });
});

describe('the bag angle and offset: helpers', () => {
  it('the pendants and the rest of the helpers past them stand at 360 (:8235)', () => {
    expect(angle(13, 20)).toEqual([360, 0, 0]);
    expect(angle(13, 7)).toEqual([270, -10, 0]); // below MODEL_PENDANT_OF_LIGHTING: the default
  });

  it('the second chain turns a helper the first stood up, and adds its offset', () => {
    expect(angle(13, 66)).toEqual([270, 0, 0]); // :8477
    expect(offset(13, 66)).toEqual([0.01, -0.05, 0]);
    expect(angle(13, 72)).toEqual([270, 180, 0]); // :8530, the gamble boxes
    expect(offset(13, 72)).toEqual([0, 0.07, 0]);
  });

  it('seals, pets and the demon (:8007-8024, :8148-8160)', () => {
    expect(angle(13, 43)).toEqual([270, 0, 0]);
    expect(offset(13, 44)).toEqual([0.005, -0.03, 0]);
    expect(offset(13, 64)).toEqual([0, -0.05, 0]);
    expect(angle(13, 64)).toEqual([270, -10, 0]);
  });
});

describe('the bag angle and offset: potions and scrolls', () => {
  it('the Heart turns by its level and is drawn as the event models at +0 and +2 (:8239-8247, ZzzObject.cpp:10531-10543)', () => {
    expect([0, 1, 2].map(level => angle(14, 12, level))).toEqual([[180, 0, 0], [270, 90, 0], [90, 0, 0]]);
    expect(pose(14, 12, 0).model).toEqual({ file: 'Item/Event02.glb', scale: 0.0025 });
    expect(pose(14, 12, 1).model).toBeNull();
    expect(pose(14, 12, 2).model).toEqual({ file: 'Item/Event03.glb', scale: 0.0025 });
  });

  it('Rena +1 and +2 are posed as MODEL_EVENT + 11 and lose Rena\'s own nudge (:10101-10118, :7853, :8840)', () => {
    expect(angle(14, 21)).toEqual([270, -10, 0]);
    expect(offset(14, 21)).toEqual([0.005, -0.005, 0]);
    expect(angle(14, 21, 1)).toEqual([-90, -20, -20]);
    expect(offset(14, 21, 1)).toEqual([0, 0, 0]);
    expect(pose(14, 21, 2).model).toEqual({ file: 'Item/EventBloodCastle03.glb', scale: 0.0015 });
    expect(pose(14, 21, 3).model).toBeNull();
  });

  it('the Box of Luck turns as its level model (RenderItem3D, ZzzInventory.cpp 6817-6848)', () => {
    expect(pose(14, 11, 0).model).toBeNull();
    expect(pose(14, 11, 4).model).toBeNull();
    expect(pose(14, 11, 5).model).toEqual({ file: 'Item/MagicBox06.glb', scale: 0.0015 });
    expect(pose(14, 11, 6).model).toEqual({ file: 'Item/MagicBox07.glb', scale: 0.0019 });
    expect(pose(14, 11, 10).model).toEqual({ file: 'Item/MagicBox08.glb', scale: 0.001 });
    expect(pose(14, 11, 3).angle).toEqual([270, 90, 0]);
    expect(pose(14, 11, 14).angle).toEqual([270, 180, 0]);
  });

  it('a branch with no angle keeps the first chain\'s (:8556-8565)', () => {
    expect(angle(14, 110)).toEqual([270, -10, 0]);
    expect(offset(14, 110)).toEqual([0.005, -0.02, 0]);
    expect(offset(14, 111)).toEqual([0.01, -0.02, 0]);
  });

  it('named potions and the chocolate boxes, whose scale branch keeps the middle angle (:9012-9017)', () => {
    expect(angle(14, 20)).toEqual([270, 0, 0]);
    expect(angle(14, 100)).toEqual([0, 0, 0]);
    expect(offset(14, 100)).toEqual([0.01, -0.05, 0]);
    expect(offset(14, 96)).toEqual([0.003, -0.013, 0]);
    expect(offset(14, 85)).toEqual([0, -0.01, 0]);
    expect(angle(14, 32)).toEqual([0, -10, 0]);
    expect(offset(14, 32)).toEqual([0, 0.05, 0]);
    expect(offset(14, 43)).toEqual([-0.04, 0.015, 0.02]); // :8228 and :9318
  });

  it('the parchments (:8278)', () => {
    expect(angle(15, 25)).toEqual([270, 0, 0]);
    expect(offset(15, 25)).toEqual([0.03, 0.03, 0]);
  });
});

// RenderItem3D, ZzzInventory.cpp:9712-10056.
describe('the anchor in the item\'s squares', () => {
  it('weapons', () => {
    expect(anchor(0, 3)).toEqual([0.8, 0.85]);
    expect(anchor(2, 22)).toEqual([0.8, 0.7]);
    expect(anchor(2, 13)).toEqual([0.6, 0.5]); // ITEM_DIVINE_SCEPTER_OF_ARCHANGEL
    expect(anchor(3, 5)).toEqual([0.6, 0.65]);
    expect(anchor(4, 17)).toEqual([0.5, 0.5]);
    expect(anchor(4, 10)).toEqual([0.7, 0.7]);
    expect(anchor(5, 32)).toEqual([0.6, 0.55]);
  });

  it('the Rage Fighter\'s glove weapons a quarter square up and left of a sword (:10052-10056)', () => {
    expect(anchor(0, 32)).toEqual([0.55, 0.6]);
  });

  it('shields and armour', () => {
    expect(anchor(6, 21)).toEqual([0.55, 0.5]);
    expect(anchor(6, 1)).toEqual([0.5, 0.6]);
    expect(anchor(7, 53)).toEqual([0.5, 0.8]);
    expect(anchor(8, 2)).toEqual([0.5, 1.05]);
    expect(anchor(8, 53)).toEqual([0.5, 0.8]);
    expect([9, 10, 11].map(group => anchor(group, 53))).toEqual([[0.5, 0.9], [0.5, 0.9], [0.5, 0.9]]);
  });

  it('helpers, the Santa invitation too, whose own row comes after the helper range (:10031)', () => {
    expect(anchor(13, 7)).toEqual([0.5, 0.9]);
    expect(anchor(13, 43)).toEqual([0.5, 0.7]);
    expect(anchor(13, 66)).toEqual([0.5, 0.7]);
    expect(anchor(13, 72)).toEqual([0.5, 0.7]);
  });

  it('potions, by level where the original asks', () => {
    expect(anchor(14, 12)).toEqual([0.5, 0.5]);
    expect(anchor(14, 21)).toEqual([0.5, 0.5]);
    expect(anchor(14, 21, 1)).toEqual([0.4, 0.8]);
    expect(anchor(14, 11, 3)).toEqual([0.5, 0.5]);
    expect(anchor(14, 11, 0)).toEqual([0.5, 0.95]);
    expect(anchor(14, 100)).toEqual([0.49, 0.28]);
    expect(anchor(14, 15)).toEqual([0.5, 0.95]);
    expect(anchor(13, 19, 5)).toEqual([0, 0]); // the Weapon of Archangel past +2 is not moved at all
  });

  it('wings, packed jewels and the rest', () => {
    expect(anchor(12, 3)).toEqual([0.5, 0.45]);
    expect(anchor(12, 30)).toEqual([0.55, 0.8]);
    expect(anchor(12, 140)).toEqual([0.55, 0.82]);
    expect(anchor(12, 26)).toEqual([0.5, 0.6]);
    expect(anchor(12, 118)).toEqual([0.5, 0.6]);
    expect(anchor(15, 25)).toEqual([0.5, 0.6]);
  });
});
