import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { BaseClass } from '../../modules/hero/characterStats';
import type { Item } from '../../ecs/world';
import type { MountKind } from '../../modules/pets/pets';
import {
  chooseAttackAction,
  chooseFenrirIdleAction,
  chooseFenrirRunAction,
  chooseFenrirWalkAction,
  chooseHighBowAttackAction,
  chooseIdleAction,
  chooseRunAction,
  chooseWalkAction,
  type CharacterPose,
} from './weaponClass';

/**
 * The clip pickers as behaviour: every pair of a representative weapon list in the two hands, every
 * base class and pose flag, every mount and swing count, with `rand()` fixed. Pinned before the
 * player clip data moved to one file per action; update on purpose.
 */
const POSE_HASH = '9fa7485f0b102dc1a0b6ec5305e71b428cab26c78e23b9096aa09471891c2eef';
const ATTACK_HASH = 'fbffd2a5b011333dc3b8e75d534045842548f40d42ccd4a8ef382b3722d68e60';

const item = (group: number, num: number): Item => ({ group, num, lvl: 0 }) as Item;
const ITEMS: (Item | null)[] = [
  null,
  item(0, 0), item(0, 5), item(0, 21), item(0, 32), item(0, 35),
  item(1, 0), item(1, 6), item(2, 0), item(2, 6),
  item(3, 1), item(3, 2), item(3, 3), item(3, 5), item(3, 7),
  item(4, 0), item(4, 7), item(4, 8), item(4, 15), item(4, 17), item(4, 18),
  item(5, 0), item(5, 6), item(5, 14), item(5, 20), item(5, 21),
  item(6, 0), item(7, 0),
];
const CLASSES = [
  BaseClass.Wizard, BaseClass.Knight, BaseClass.Elf, BaseClass.MagicGladiator,
  BaseClass.DarkLord, BaseClass.Summoner, BaseClass.RageFighter,
];
const MOUNTS: (MountKind | null | undefined)[] = [undefined, null, 'fenrir', 'horse', 'uniria', 'dinorant'];
const BOOLS = [false, true];

afterEach(() => vi.restoreAllMocks());

describe('weapon clip pickers', () => {
  it('stand, walk and run as they did', () => {
    const h = createHash('sha256');
    const pickers = [chooseIdleAction, chooseWalkAction, chooseRunAction, chooseFenrirIdleAction, chooseFenrirWalkAction, chooseFenrirRunAction];
    for (const main of ITEMS)
      for (const off of ITEMS)
        for (const baseClass of CLASSES)
          for (const isFemale of BOOLS)
            for (const weaponsStowed of BOOLS)
              for (const inChaosCastle of BOOLS) {
                const pose: CharacterPose = { hands: { leftHand: main, rightHand: off }, baseClass, isFemale, weaponsStowed, inChaosCastle };
                h.update(pickers.map(p => p(pose)).join(',') + ';');
              }
    for (const baseClass of CLASSES) {
      const pose: CharacterPose = { hands: undefined, baseClass, isFemale: false, weaponsStowed: true, inChaosCastle: false };
      h.update(pickers.map(p => p(pose)).join(',') + ';');
    }
    expect(h.digest('hex')).toBe(POSE_HASH);
  });

  it('swing as they did', () => {
    let roll = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ((roll = (roll + 0.37) % 1), roll));
    const h = createHash('sha256');
    for (const main of ITEMS)
      for (const off of ITEMS)
        for (const baseClass of CLASSES)
          for (const mount of MOUNTS)
            for (const wings of BOOLS)
              for (let swordCount = 0; swordCount < 6; swordCount++) {
                const pose = { hands: { leftHand: main, rightHand: off }, baseClass, swordCount, wings, mount };
                h.update(`${chooseAttackAction(pose)},${chooseHighBowAttackAction(pose)};`);
              }
    expect(h.digest('hex')).toBe(ATTACK_HASH);
  });
});
