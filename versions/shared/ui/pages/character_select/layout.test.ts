import { describe, expect, it } from 'vitest';
import { CharacterClassNumber } from '@/core/types';
import type { VersionFeatures } from '@/version/contract';
import { CREATABLE_CLASSES, offeredBy } from './layout';

const ALL: VersionFeatures = {
  masterSkills: true,
  socketItems: true,
  ancientItems: true,
  darkLord: true,
  magicGladiator: true,
  summoner: true,
  rageFighter: true,
  itemHotkeys: { slots: 4, bindable: true },
};

const offered = (features: VersionFeatures) =>
  CREATABLE_CLASSES.filter(cls => offeredBy(cls, features)).map(cls => cls.netClass);

describe('the classes a version offers in the create window', () => {
  it('is every class for a version that has them all', () => {
    expect(offered(ALL)).toHaveLength(CREATABLE_CLASSES.length);
  });

  it('leaves out each class the version lacks', () => {
    // 0.97d: the three first classes and the Magic Gladiator.
    expect(offered({ ...ALL, darkLord: false, summoner: false, rageFighter: false })).toEqual([
      CharacterClassNumber.DarkWizard,
      CharacterClassNumber.DarkKnight,
      CharacterClassNumber.FairyElf,
      CharacterClassNumber.MagicGladiator,
    ]);
  });
});
