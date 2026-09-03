import { describe, expect, it } from 'vitest';
import {
  decodeMuHelperConfig,
  defaultMuHelperConfig,
  encodeMuHelperConfig,
  MU_HELPER_BLOB_SIZE,
  type MuHelperConfig,
} from './config';

function maximalConfig(): MuHelperConfig {
  return {
    huntingRange: 4,
    longRangeCounterAttack: true,
    returnToOriginalPosition: true,
    maxSecondsAway: 12,
    skills: [19, 41, 232],
    skillIntervals: [0, 7, 45],
    skillConditions: [
      { onTimer: false, onCondition: false, basis: 'nearby', minMobs: 2 },
      { onTimer: true, onCondition: false, basis: 'nearby', minMobs: 3 },
      { onTimer: false, onCondition: true, basis: 'attacking', minMobs: 5 },
    ],
    useCombo: true,
    buffs: [28, 27, 16],
    buffDuration: false,
    buffDurationParty: false,
    buffCastInterval: 120,
    autoHeal: true,
    healThreshold: 70,
    supportParty: true,
    autoHealParty: true,
    healPartyThreshold: 50,
    useHealPotion: true,
    potionThreshold: 30,
    useDrainLife: true,
    useDarkRaven: true,
    darkRavenMode: 2,
    repairItem: true,
    obtainRange: 3,
    pickAllItems: false,
    pickSelectedItems: true,
    pickJewel: true,
    pickZen: true,
    pickAncient: true,
    pickExcellent: true,
    pickExtraItems: true,
    extraItems: [
      'Sword',
      'Jewel of Bless',
      'a',
      'exactly14chars',
      'Box of Kundun',
    ],
  };
}

describe('MU Helper blob codec', () => {
  it('always yields 257 bytes', () => {
    expect(encodeMuHelperConfig(defaultMuHelperConfig()).length).toBe(
      MU_HELPER_BLOB_SIZE
    );
  });

  it('encodes the default config to the reference layout', () => {
    const blob = encodeMuHelperConfig(defaultMuHelperConfig());
    expect(blob[0]).toBe(0); // marker
    expect(blob[1]).toBe(0); // no pickup filters
    expect(blob[2]).toBe(6 | (8 << 4)); // hunt 6, obtain 8
    expect(blob[3]).toBe(10); // max seconds away (LE low byte)
    expect(blob[4]).toBe(0);
    expect(blob[23]).toBe(4 | (6 << 4)); // potion 40, heal 60
    expect(blob[24]).toBe(6 | (6 << 4)); // party 60, drain-life mirror 60
    expect(blob[25]).toBe(0x10); // only OriginalPosition
    expect(blob[26]).toBe(0x05); // BuffDurationParty + BuffDuration
    expect(blob[27]).toBe(0);
    expect(blob[28]).toBe(0);
    // Padding and tail stay zero.
    for (let i = 29; i < 65; i++) expect(blob[i]).toBe(0);
    for (let i = 245; i < 257; i++) expect(blob[i]).toBe(0);
  });

  it('packs the flag bytes bit-for-bit', () => {
    const blob = encodeMuHelperConfig(maximalConfig());
    // jewel(3) ancient(4) excellent(5) zen(6) extra(7)
    expect(blob[1]).toBe(0xf8);
    expect(blob[2]).toBe(4 | (3 << 4));
    // potion(0) heal(1) drain(2) longRange(3) origPos(4) combo(5) party(6) partyHeal(7)
    expect(blob[25]).toBe(0xff);
    // durationParty=0, raven(1), duration=0, skill1 timer(3), precon nearby, subcon 1 (>=3)
    expect(blob[26]).toBe(0x02 | 0x08 | (1 << 6));
    // skill2 con(1) + precon attacking(2) + subcon 3 (>=5) + repair(5) + pickSelected(7)
    expect(blob[27]).toBe(0x02 | 0x04 | (3 << 3) | 0x20 | 0x80);
    expect(blob[28]).toBe(2);
  });

  it('round-trips a maximal config', () => {
    const config = maximalConfig();
    const back = decodeMuHelperConfig(encodeMuHelperConfig(config));
    expect(back).toEqual(config);
  });

  it('round-trips the encoded bytes exactly', () => {
    const blob = encodeMuHelperConfig(maximalConfig());
    const again = encodeMuHelperConfig(decodeMuHelperConfig(blob));
    expect(Array.from(again)).toEqual(Array.from(blob));
  });

  it('decodes an all-zero blob without throwing', () => {
    const config = decodeMuHelperConfig(new Uint8Array(MU_HELPER_BLOB_SIZE));
    expect(config.huntingRange).toBe(0);
    expect(config.skills).toEqual([0, 0, 0]);
    expect(config.extraItems).toEqual([]);
    expect(config.skillConditions[1].minMobs).toBe(2);
  });

  it('truncates extra item names to 14 ANSI chars and drops non-ANSI ones', () => {
    const config = defaultMuHelperConfig();
    config.extraItems = ['A far too long item name', 'ポーション', 'Zen'];
    const back = decodeMuHelperConfig(encodeMuHelperConfig(config));
    expect(back.extraItems).toEqual(['A far too long', 'Zen']);
  });

  it('clamps the away seconds to the serializer nibble', () => {
    const config = defaultMuHelperConfig();
    config.maxSecondsAway = 31;
    const back = decodeMuHelperConfig(encodeMuHelperConfig(config));
    expect(back.maxSecondsAway).toBe(15);
  });
});
