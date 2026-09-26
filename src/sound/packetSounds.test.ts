import { describe, expect, it } from 'vitest';
import { monsterCast, monsterSwing, type MonsterAttackInput } from '../common/monsterAttackClip';
import { ServerPlayerActionType as S } from '../common/objects/enum';
import { ENUM_WORLD as W } from '../common/types';
import { SOUND_FILES } from './recipes';
import {
  METEORITE_STORM,
  SWIRL_BLOOM,
  SWIRL_BLOOM_SECONDS,
  SWIRL_START,
  appearSound,
  meteoriteStormRunning,
  monsterCastQuiet,
  santaActionSound,
  teleportCastSound,
  trapAttackSound,
} from './packetSounds';

function trapInput(now: number): MonsterAttackInput {
  return {
    world: W.WD_4LOSTTOWER,
    monster: 103,
    model: -1,
    trapObject: 25,
    random: () => 0,
    now,
  };
}

describe('packetSounds', () => {
  it('voices the lance and iron stick traps with the grate, the fire and laser traps with the flame', () => {
    expect(trapAttackSound(39)?.key).toBe('Sound/aGrate');
    expect(trapAttackSound(40)?.key).toBe('Sound/aGrate');
    expect(trapAttackSound(40)?.opts.channels).toBe(1);
    expect(trapAttackSound(51)?.key).toBe('Sound/sFlame');
    expect(trapAttackSound(51)?.opts.channels).toBe(2);
    // The meteorite trap's sound is its storm, not the attack branch.
    expect(trapAttackSound(25)).toBeUndefined();
    expect(trapAttackSound(undefined)).toBeUndefined();
  });

  it('runs the meteorite storm only while a Flame of Evil cast keeps the AttackTime going', () => {
    const state = { swordCount: 0, skill: 0, skillClearsAt: Infinity };
    // A bare swing (0x18) starts AttackTime but sets no skill: no storm.
    monsterSwing(state, trapInput(0));
    expect(meteoriteStormRunning(103, state, 0)).toBe(false);

    monsterCast(state, 50, trapInput(1000));
    expect(meteoriteStormRunning(103, state, 1000)).toBe(true);
    expect(meteoriteStormRunning(103, state, 1500)).toBe(true);
    // 14 frames at 25 fps later the AttackTime is over.
    expect(meteoriteStormRunning(103, state, 1560)).toBe(false);
    // Another trap on the same skill has no storm.
    expect(meteoriteStormRunning(100, state, 1000)).toBe(false);
    expect(METEORITE_STORM.key).toBe('Sound/eMeteorite');
  });

  it('lets only AppearMonster\'s three voices sound on a spawn', () => {
    expect(appearSound(44, false)?.key).toBe('Sound/mBullAttack1');
    expect(appearSound(21, false)?.key).toBe('Sound/mAssassin1');
    expect(appearSound(21, true)?.opts.channels).toBe(1);
    for (const archer of [85, 91, 97, 114, 120, 126]) {
      expect(appearSound(archer, false)?.key).toBe('Sound/mOrcCapAttack1');
    }
    // Chief Skeleton Archer 7, the Golden Titan and the Crywolf elves: no sound.
    for (const silent of [139, 53, 54, 340, 440]) expect(appearSound(silent, false)).toBeUndefined();
  });

  it('drops the Kalima gate stone only when the gate comes by 0x1F', () => {
    for (const gate of [152, 155, 158]) {
      expect(appearSound(gate, true)?.key).toBe('Sound/eWallFall');
      expect(appearSound(gate, true)?.opts.channels).toBe(1);
      expect(appearSound(gate, false)).toBeUndefined();
    }
    expect(appearSound(151, true)).toBeUndefined();
    expect(appearSound(159, true)).toBeUndefined();
  });

  it('blooms the swirl at LifeTime 30, 15 and 4 of 52', () => {
    expect(SWIRL_START.key).toBe('Sound/cherryblossom/Eve_CherryBlossoms01');
    expect(SWIRL_BLOOM.key).toBe('Sound/cherryblossom/Eve_CherryBlossoms02');
    expect(SWIRL_BLOOM_SECONDS.map(s => Math.round(s * 1000))).toEqual([880, 1480, 1920]);
  });

  it('sounds the Nightmare teleport only in Kanturu 3rd', () => {
    expect(teleportCastSound(W.WD_39KANTURU_3RD, 361, 6)?.key).toBe('Sound/w39/nightmare_tele');
    expect(teleportCastSound(W.WD_38KANTURU_2ND, 361, 6)).toBeUndefined();
    expect(teleportCastSound(W.WD_39KANTURU_3RD, 360, 6)).toBeUndefined();
    expect(teleportCastSound(W.WD_39KANTURU_3RD, 361, 15)).toBeUndefined();
  });

  it('keeps the monster casts the original never voices quiet', () => {
    // Vepar's Energy Ball, a Yeti-model one, the Queen Bee's lightning.
    expect(monsterCastQuiet(46, 29, 17)).toBe(true);
    expect(monsterCastQuiet(19, 12, 17)).toBe(true);
    expect(monsterCastQuiet(292, 83, 3)).toBe(true);
    // An unlisted Energy Ball caster, and anyone else's lightning.
    expect(monsterCastQuiet(34, 26, 17)).toBe(false);
    expect(monsterCastQuiet(37, 30, 3)).toBe(false);
    expect(monsterCastQuiet(46, 29, 3)).toBe(false);
  });

  it('jumps as santa, reindeer or snowman and turns with one sound', () => {
    expect(santaActionSound(S.Santa1_1)?.key).toBe('Sound/xmasjumpsanta');
    expect(santaActionSound(S.Santa1_2)?.key).toBe('Sound/xmasjumpsasum');
    expect(santaActionSound(S.Santa1_3)?.key).toBe('Sound/xmasjumpsnowman');
    for (const turn of [S.Santa2_1, S.Santa2_2, S.Santa2_3]) {
      expect(santaActionSound(turn)?.key).toBe('Sound/xmasturn');
    }
    expect(santaActionSound(S.Jack2)).toBeUndefined();
    expect(santaActionSound(164)).toBeUndefined();
  });

  it('names only catalogued keys', () => {
    const rows = [
      trapAttackSound(39),
      trapAttackSound(51),
      METEORITE_STORM,
      appearSound(44, false),
      appearSound(21, false),
      appearSound(85, false),
      appearSound(152, true),
      SWIRL_START,
      SWIRL_BLOOM,
      teleportCastSound(W.WD_39KANTURU_3RD, 361, 6),
      santaActionSound(S.Santa1_1),
      santaActionSound(S.Santa1_2),
      santaActionSound(S.Santa1_3),
      santaActionSound(S.Santa2_1),
    ];
    for (const r of rows) expect(SOUND_FILES[r!.key]).toBeDefined();
  });
});
