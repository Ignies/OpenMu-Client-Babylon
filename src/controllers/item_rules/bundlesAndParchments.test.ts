import { describe, expect, it } from 'vitest';
import { itemDef } from './itemStats';
import { learnableSkillNumber } from './skillItems';

// ITEM_PACKED_JEWEL_OF_LIFE .. ITEM_PACKED_HIGHER_REFINE_STONE (_enum.h:2697-2704), their models
// (ZzzOpenData.cpp:959-966) and Item.bmd's rows.
describe('the packed jewels', () => {
  const PACKED: [number, string, string][] = [
    [136, 'Jewel of Life Bundle', 'Jewel03.glb'],
    [137, 'Jewel of Creation Bundle', 'jewel22.glb'],
    [138, 'Jewel of Guardian Bundle', 'suho.glb'],
    [139, 'Gemstone Bundle', 'rs.glb'],
    [140, 'Jewel of Harmony Bundle', 'jos.glb'],
    [141, 'Jewel of Chaos Bundle', 'Jewel15.glb'],
    [142, 'Lower Refining Stone Bundle', 'LowRefineStone.glb'],
    [143, 'Higher Refining Stone Bundle', 'HighRefineStone.glb'],
  ];

  it.each(PACKED)('12/%i is the %s', (index, name, model) => {
    expect(itemDef(12, index)).toMatchObject({ name, modelName: model, width: 1, height: 1, classes: [1, 1, 1, 1, 1, 1, 1] });
  });
});

// ITEM_CHAIN_DRIVE_PARCHMENT .. ITEM_INCREASE_BLOCK_PARCHMENT (_enum.h:2859-2865), the Rage Fighter's.
describe('the Rage Fighter parchments', () => {
  it.each([
    [30, 'Chain Drive Parchment', 262],
    [31, 'Dark Side Parchment', 263],
    [32, 'Dragon Roar Parchment', 264],
    [33, 'Dragon Slasher Parchment', 265],
    [34, 'Ignore Defense Parchment', 266],
    [35, 'Increase Health Parchment', 267],
    [36, 'Increase Block Parchment', 268],
  ])('15/%i is the %s and teaches skill %i', (index, name, skill) => {
    expect(itemDef(15, index)).toMatchObject({ name, modelName: 'rollofpaper.glb', classes: [0, 0, 0, 0, 0, 0, 1] });
    expect(learnableSkillNumber(15, index)).toBe(skill);
  });
});
