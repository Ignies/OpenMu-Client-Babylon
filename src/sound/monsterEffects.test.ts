import { describe, expect, it } from 'vitest';
import { attackEffectSounds, MonsterAttackEffects, type ClipSource } from './monsterEffects';
import { SOUND_FILES } from './recipes';
import {
  monsterAttackState,
  monsterCast,
  monsterSwing,
  type MonsterAttackInput,
} from '../common/monsterAttackClip';
import { MonsterActionType as A } from '../common/objects/enum';
import { ENUM_WORLD as W } from '../common/types';

const WORLDS = Object.values(W).filter((w): w is W => typeof w === 'number');

type Played = { key: string; channels: number | undefined; at: string };

function setup() {
  const played: Played[] = [];
  const effects = new MonsterAttackEffects<string>((key, channels, at) => {
    played.push({ key, channels, at });
    return 1;
  });
  return { played, effects };
}

function input(world: number, monster: number, now: number): MonsterAttackInput {
  return { world, monster, model: -1, trapObject: undefined, random: () => 0, now };
}

/** A monster in scope: the owner logic.ts keys its state by, and the clip it plays. */
function monster(number: number, world: number, action = A.Stop1) {
  const owner: { objOutOfScope?: boolean } = {};
  const clip: ClipSource & { CurrentAction: number } = { CurrentAction: action };
  const swing = (now: number) => monsterSwing(monsterAttackState(owner), input(world, number, now));
  const cast = (skill: number, now: number) =>
    monsterCast(monsterAttackState(owner), skill, input(world, number, now));
  return { owner, clip, swing, cast };
}

describe('AttackEffect sounds', () => {
  it('names a catalogue key in every row', () => {
    const missing: string[] = [];
    for (const world of WORLDS) {
      for (let n = 0; n < 600; n++) {
        for (const s of attackEffectSounds(world, n) ?? []) {
          if (!(s.play in SOUND_FILES)) missing.push(`world ${world} monster ${n} -> ${s.play}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('plays tick 1 of an Energy Ball once, however many frames see it', () => {
    const { played, effects } = setup();
    const vepar = monster(46, W.WD_7ATLANSE);
    vepar.swing(1000);
    vepar.cast(17, 1000);
    for (const now of [1010, 1026, 1043]) {
      effects.drain(now, W.WD_7ATLANSE);
      effects.note(vepar.owner, 46, W.WD_7ATLANSE, vepar.clip, 'vepar', now);
    }
    expect(played).toEqual([{ key: 'Sound/sEvil', channels: 2, at: 'vepar' }]);
  });

  it('stays silent for a plain swing or a skill the row does not name', () => {
    const { played, effects } = setup();
    const vepar = monster(46, W.WD_7ATLANSE);
    vepar.swing(1000);
    effects.note(vepar.owner, 46, W.WD_7ATLANSE, vepar.clip, 'vepar', 1010);
    const balrog = monster(38, W.WD_4LOSTTOWER);
    balrog.swing(1000);
    // OpenMU's generic monster skill, not AT_SKILL_BOSS
    balrog.cast(150, 1000);
    effects.note(balrog.owner, 38, W.WD_4LOSTTOWER, balrog.clip, 'balrog', 1010);
    expect(played).toEqual([]);
  });

  it('answers a second AttackTime with a second play', () => {
    const { played, effects } = setup();
    const devil = monster(37, W.WD_4LOSTTOWER);
    devil.cast(3, 1000);
    effects.note(devil.owner, 37, W.WD_4LOSTTOWER, devil.clip, 'devil', 1010);
    devil.cast(3, 2000);
    effects.note(devil.owner, 37, W.WD_4LOSTTOWER, devil.clip, 'devil', 2010);
    expect(played.map(p => p.key)).toEqual(['Sound/sEvil', 'Sound/sEvil']);
  });

  it('has no Beam Knight row on any map', () => {
    // The switch's own Beam Knight case spends tick 1 before the Energy Ball half.
    expect(WORLDS.filter(w => attackEffectSounds(w, 61) !== null)).toEqual([]);
  });

  it('leaves a Magic Skeleton lightning to the cast eThunder', () => {
    const { played, effects } = setup();
    const skeleton = monster(89, W.WD_4LOSTTOWER);
    skeleton.cast(3, 1000);
    effects.note(skeleton.owner, 89, W.WD_4LOSTTOWER, skeleton.clip, 'skeleton', 1010);
    expect(played).toEqual([]);
  });

  it('leaves the Meteorite Trap to packetSounds', () => {
    expect(attackEffectSounds(W.WD_4LOSTTOWER, 103)).toBeNull();
  });

  it('plays the Balrog hellfire and one meteor for AT_SKILL_BOSS', () => {
    const { played, effects } = setup();
    const balrog = monster(38, W.WD_4LOSTTOWER);
    balrog.cast(50, 1000);
    effects.note(balrog.owner, 38, W.WD_4LOSTTOWER, balrog.clip, 'balrog', 1010);
    expect(played.map(p => p.key)).toEqual(['Sound/sHellFire', 'Sound/eMeteorite']);
  });

  it('ignores an AttackTime that is not running when first seen', () => {
    const { played, effects } = setup();
    const gorgon = monster(35, W.WD_4LOSTTOWER);
    effects.note(gorgon.owner, 35, W.WD_4LOSTTOWER, gorgon.clip, 'gorgon', 0);
    gorgon.cast(50, 1000);
    // seen only after the AttackTime ran out
    effects.note(gorgon.owner, 35, W.WD_4LOSTTOWER, gorgon.clip, 'gorgon', 1600);
    expect(played).toEqual([]);
  });
});

describe('the tick queue', () => {
  it('breathes the Drakan fire on tick 13 of any clip but Attack1', () => {
    const { played, effects } = setup();
    const drakan = monster(73, W.WD_10ICARUS, A.Attack2);
    drakan.swing(1000);
    drakan.cast(150, 1000);
    effects.note(drakan.owner, 73, W.WD_10ICARUS, drakan.clip, 'drakan', 1016);
    effects.drain(1479, W.WD_10ICARUS);
    expect(played).toEqual([]);
    // 12 ticks of 40 ms after the start
    effects.drain(1480, W.WD_10ICARUS);
    expect(played).toEqual([{ key: 'Sound/eMeteorite', channels: 2, at: 'drakan' }]);
  });

  it('reads the clip when the tick comes, not when the swing starts', () => {
    const { played, effects } = setup();
    const drakan = monster(75, W.WD_10ICARUS, A.Attack2);
    drakan.swing(1000);
    effects.note(drakan.owner, 75, W.WD_10ICARUS, drakan.clip, 'drakan', 1016);
    drakan.clip.CurrentAction = A.Attack1;
    effects.drain(1500, W.WD_10ICARUS);
    expect(played).toEqual([]);
  });

  it('drops a tick a newer AttackTime restarted', () => {
    const { played, effects } = setup();
    const drakan = monster(73, W.WD_10ICARUS, A.Attack2);
    drakan.swing(1000);
    effects.note(drakan.owner, 73, W.WD_10ICARUS, drakan.clip, 'drakan', 1016);
    drakan.swing(1200);
    effects.note(drakan.owner, 73, W.WD_10ICARUS, drakan.clip, 'drakan', 1216);
    effects.drain(1500, W.WD_10ICARUS);
    expect(played).toEqual([]);
    effects.drain(1680, W.WD_10ICARUS);
    expect(played).toHaveLength(1);
  });

  it('drops a tick that comes due too late, out of scope or on another map', () => {
    const { played, effects } = setup();
    const a = monster(73, W.WD_10ICARUS, A.Attack2);
    a.swing(1000);
    effects.note(a.owner, 73, W.WD_10ICARUS, a.clip, 'a', 1016);
    effects.drain(1560, W.WD_10ICARUS);
    const b = monster(73, W.WD_10ICARUS, A.Attack2);
    b.swing(2000);
    effects.note(b.owner, 73, W.WD_10ICARUS, b.clip, 'b', 2016);
    effects.drain(2500, W.WD_0LORENCIA);
    const c = monster(73, W.WD_10ICARUS, A.Attack2);
    c.swing(3000);
    effects.note(c.owner, 73, W.WD_10ICARUS, c.clip, 'c', 3016);
    c.owner.objOutOfScope = true;
    effects.drain(3500, W.WD_10ICARUS);
    expect(played).toEqual([]);
  });

  it('plays the Kalima casters on tick 13, only in Kalima', () => {
    const { played, effects } = setup();
    const centurion = monster(145, W.WD_24HELLAS);
    centurion.cast(55, 1000);
    effects.note(centurion.owner, 145, W.WD_24HELLAS, centurion.clip, 'dc', 1016);
    effects.drain(1480, W.WD_24HELLAS);
    expect(played).toEqual([{ key: 'Sound/eSkull', channels: 1, at: 'dc' }]);
    expect(attackEffectSounds(W.WD_0LORENCIA, 145)).toBeNull();
    // Death Centurion 7 and Illusion of Kundun 6 are in no case
    expect(attackEffectSounds(W.WD_24HELLAS_7, 336)).toBeNull();
    expect(attackEffectSounds(W.WD_24HELLAS, 338)).toBeNull();
  });
});
