import { describe, expect, it } from 'vitest';
import {
  KEEP_CLIP,
  monsterAreaCast,
  monsterAttack,
  monsterAttackState,
  monsterCast,
  monsterCastRewinds,
  monsterFlinches,
  monsterMagic,
  monsterSwing,
  playableMonsterClip,
  type MonsterAttackInput,
  type MonsterAttackState,
} from './monsterAttackClip';
import { MonsterActionType as A } from './objects/enum';

const fresh = (): MonsterAttackState => ({ swordCount: 0, skill: 0, skillClearsAt: Infinity });

/** Hands out the given rolls in order; a roll nobody planned for fails the test. */
function rolls(...values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('unexpected rand()');
    return values[i++];
  };
}

function input(
  world: number,
  monster: number,
  model = -1,
  random: () => number = rolls(),
  trapObject?: number,
  now = 0
): MonsterAttackInput {
  return { world, monster, model, trapObject, random, now };
}

/** `count` swings of one monster through SetPlayerAttack. */
function swings(state: MonsterAttackState, count: number, at: MonsterAttackInput): number[] {
  return Array.from({ length: count }, () => monsterAttack(state, at));
}

describe('SetPlayerAttack default', () => {
  it('plays Attack1 on every third swing and counts two a swing', () => {
    const state = fresh();
    expect(swings(state, 6, input(0, 3, 9))).toEqual([
      A.Attack1, A.Attack2, A.Attack2, A.Attack1, A.Attack2, A.Attack2,
    ]);
    expect(state.swordCount).toBe(12);
  });

  it('chooses again when the 0x19 that follows names an attack skill', () => {
    const state = fresh();
    const at = input(0, 25, 18);
    const finals = Array.from({ length: 4 }, () => {
      monsterAttack(state, at);
      return monsterCast(state, 11, at);
    });
    expect(finals).toEqual([A.Attack2, A.Attack1, A.Attack2, A.Attack2]);
    expect(state.skill).toBe(11);
  });
});

describe('ReceiveMagic on a monster', () => {
  it('runs SetPlayerMagic for the support skills, one count a cast', () => {
    const state = fresh();
    expect([26, 26, 26, 26].map(skill => monsterCast(state, skill, input(0, 3)))).toEqual([
      A.Attack1, A.Attack2, A.Attack2, A.Attack1,
    ]);
    expect(state.swordCount).toBe(4);
    expect(monsterCastRewinds(26)).toBe(true);
  });

  it('leaves the clip for a skill it has no case for, but records it', () => {
    const state = fresh();
    expect(monsterCast(state, 150, input(0, 3))).toBe(KEEP_CLIP);
    expect(state.skill).toBe(150);
    expect(state.swordCount).toBe(0);
    expect(monsterCastRewinds(150)).toBe(false);
  });

  it('does not record the combo announcement', () => {
    const state = fresh();
    state.skill = 17;
    expect(monsterCast(state, 59, input(0, 3))).toBe(KEEP_CLIP);
    expect(state.skill).toBe(17);
  });

  it('swings without a rewind for the monster buffs', () => {
    expect(monsterCast(fresh(), 200, input(0, 3))).toBe(A.Attack1);
    expect(monsterCastRewinds(200)).toBe(false);
    expect(monsterCastRewinds(17)).toBe(true);
  });

  it('plays the appear clip for the Doppelganger self-destruction', () => {
    expect(monsterCast(fresh(), 239, input(0, 3))).toBe(A.Appear);
  });

  it('swings for any area skill and records it', () => {
    const state = fresh();
    expect(monsterAreaCast(state, 39, input(0, 3))).toBe(A.Attack1);
    expect(state.skill).toBe(39);
  });
});

describe('special bodies', () => {
  it('rolls the Bali clips from rand() % 8', () => {
    const bali = (...r: number[]) => monsterAttack(fresh(), input(0, 150, 32, rolls(...r)));
    expect(bali(0.5, 0.2)).toBe(A.Attack1);
    expect(bali(0.5, 0.7)).toBe(A.Attack2);
    expect(bali(0.2)).toBe(A.Attack3);
    expect(bali(0.0)).toBe(A.Attack4);
  });

  it('gives the lance, fire and laser traps no clip and the iron stick Stop2', () => {
    const trap = (object: number) => monsterAttack(fresh(), input(2, 100, -1, rolls(), object));
    expect(trap(39)).toBe(KEEP_CLIP);
    expect(trap(51)).toBe(KEEP_CLIP);
    expect(trap(40)).toBe(A.Stop2);
    expect(trap(25)).toBe(A.Attack1);
    expect(trap(11)).toBe(A.Attack1);
  });

  it('plays the Castle Siege guards on clip 5 anywhere', () => {
    expect(monsterAttack(fresh(), input(0, 286, 76))).toBe(A.Shock);
    expect(monsterAttack(fresh(), input(30, 287, 77))).toBe(A.Shock);
  });

  it('counts one a swing when something other than the default chose', () => {
    const state = fresh();
    monsterAttack(state, input(0, 286, 76));
    expect(state.swordCount).toBe(1);
  });
});

describe('Kalima (any map)', () => {
  it('turns Aegis and Rogue Centurion to Attack2 once Energy Ball is their skill', () => {
    const state = fresh();
    expect(monsterAttack(state, input(0, 147))).toBe(A.Attack1);
    state.skill = 17;
    expect(monsterAttack(state, input(0, 147))).toBe(A.Attack2);
    expect(monsterAttack(state, input(24, 272))).toBe(A.Attack2);
  });

  it('turns Death Centurion to Attack2 for its listed skills', () => {
    const state = fresh();
    state.skill = 1;
    expect(monsterAttack(state, input(0, 145))).toBe(A.Attack2);
    state.skill = 26;
    expect(monsterAttack(state, input(0, 145))).toBe(A.Attack1);
  });

  it('leaves Necron alone unless its skill is Poison or Energy Ball', () => {
    const state = fresh();
    expect(monsterAttack(state, input(0, 149))).toBe(KEEP_CLIP);
    state.skill = 1;
    expect(monsterAttack(state, input(0, 149))).toBe(A.Attack2);
    state.skill = 17;
    expect(monsterAttack(state, input(0, 149))).toBe(A.Attack1);
  });

  it('flips a coin for Schriker and the Illusions of Kundun', () => {
    expect(monsterAttack(fresh(), input(0, 160, -1, rolls(0.2)))).toBe(A.Attack1);
    expect(monsterAttack(fresh(), input(0, 275, -1, rolls(0.7)))).toBe(A.Attack2);
  });

  it('leaves the Kalima 7 set to the default', () => {
    const state = fresh();
    state.skill = 17;
    expect(swings(state, 2, input(36, 331))).toEqual([A.Attack1, A.Attack2]);
  });
});

describe('map hooks', () => {
  it('Land of Trials: Fire Golem swings Attack2 unless its skill is the boss one', () => {
    const state = fresh();
    expect(monsterAttack(state, input(31, 291))).toBe(A.Attack2);
    state.skill = 50;
    expect(monsterAttack(state, input(31, 291))).toBe(A.Attack1);
    expect(monsterAttack(fresh(), input(0, 291))).toBe(A.Attack1);
  });

  it('CheckMonsterSkill: Attack1 on every swing without a 0x69 skill', () => {
    const attack1 = [A.Attack1, A.Attack1, A.Attack1];
    for (const [world, monster] of [
      [33, 309], [33, 304], [54, 550], [34, 340], [34, 349], [34, 341], [34, 440],
      [38, 358], [39, 362], [39, 361], [41, 412], [42, 409], [45, 388], [50, 403],
    ]) {
      expect(swings(fresh(), 3, input(world, monster))).toEqual(attack1);
    }
  });

  it('runs each hook only on its own maps', () => {
    expect(swings(fresh(), 2, input(0, 309))).toEqual([A.Attack1, A.Attack2]);
    expect(swings(fresh(), 2, input(38, 361))).toEqual([A.Attack1, A.Attack2]);
    expect(swings(fresh(), 2, input(51, 388))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Crywolf monsters use the hook in Devil Square too, OpenMU map 32 included', () => {
    expect(swings(fresh(), 2, input(9, 340))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(32, 340))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(10, 340))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Aida: the bloody golem and witch queen swing Attack1', () => {
    expect(swings(fresh(), 2, input(33, 551))).toEqual([A.Attack1, A.Attack1]);
  });

  it('Kanturu: Persona, Twin Tail and Dreadfear stay on Attack1 on both floors', () => {
    expect(swings(fresh(), 2, input(38, 358))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(39, 360))).toEqual([A.Attack1, A.Attack1]);
  });

  it('Kanturu: Maya keeps her clip', () => {
    expect(monsterAttack(fresh(), input(39, 364))).toBe(KEEP_CLIP);
  });

  it('Kanturu 1st: a coin for the six, the default for Kentauros and the warriors', () => {
    expect(monsterAttack(fresh(), input(37, 350, -1, rolls(0.2)))).toBe(A.Attack1);
    expect(monsterAttack(fresh(), input(37, 555, -1, rolls(0.8)))).toBe(A.Attack2);
    expect(swings(fresh(), 2, input(37, 355))).toEqual([A.Attack1, A.Attack2]);
    expect(swings(fresh(), 2, input(37, 553))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Swamp of Calmness: Medusa by skill, the others on Attack1', () => {
    const medusa = (skill: number) => {
      const state = fresh();
      state.skill = skill;
      return monsterAttack(state, input(56, 561, 192));
    };
    expect(medusa(38)).toBe(A.Attack2);
    expect(medusa(238)).toBe(A.Attack2);
    expect(medusa(237)).toBe(A.Attack3);
    expect(medusa(9)).toBe(A.Attack1);
    expect(medusa(0)).toBe(A.Attack1);
    expect(swings(fresh(), 2, input(56, 557, 201))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(0, 557, 201))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Raklion: Selupan swings Attack4, the ice monsters Attack1, the eggs the default', () => {
    expect(monsterAttack(fresh(), input(58, 459))).toBe(A.Attack4);
    expect(swings(fresh(), 2, input(57, 454))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(57, 460))).toEqual([A.Attack1, A.Attack2]);
    expect(swings(fresh(), 2, input(0, 459))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Empire Guardian: the shared list on all four maps, each map its own', () => {
    expect(swings(fresh(), 2, input(69, 506))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(72, 519))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(70, 509))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(69, 509))).toEqual([A.Attack1, A.Attack2]);
    expect(swings(fresh(), 2, input(72, 504))).toEqual([A.Attack1, A.Attack1]);
    expect(swings(fresh(), 2, input(71, 504))).toEqual([A.Attack1, A.Attack2]);
  });

  it('Loren Market: Lucas keeps his clip there and swings Attack1 in Empire Guardian', () => {
    expect(monsterAttack(fresh(), input(79, 507))).toBe(KEEP_CLIP);
    expect(monsterAttack(fresh(), input(69, 507))).toBe(A.Attack1);
  });
});

describe('c->Skill', () => {
  const necron = (now: number) => input(0, 149, -1, rolls(), undefined, now);

  it('is zeroed once the AttackTime of the last swing or cast runs out', () => {
    const state = fresh();
    expect(monsterCast(state, 1, necron(0))).toBe(A.Attack2);
    expect(monsterSwing(state, necron(559))).toBe(A.Attack2);
    expect(monsterSwing(state, necron(1118))).toBe(A.Attack2);
    expect(monsterSwing(state, necron(1678))).toBe(KEEP_CLIP);
    expect(state.skill).toBe(0);
  });

  it('outlives a cast that starts no AttackTime until a swing starts one', () => {
    const state = fresh();
    const medusa = (now: number) => input(56, 561, 192, rolls(), undefined, now);
    expect(monsterCast(state, 238, medusa(0))).toBe(A.Attack2);
    expect(monsterSwing(state, medusa(5000))).toBe(A.Attack2);
    expect(monsterSwing(state, medusa(5560))).toBe(A.Attack1);
  });

  it('is set by an area cast, which starts the AttackTime too', () => {
    const state = fresh();
    const golem = (now: number) => input(31, 291, -1, rolls(), undefined, now);
    expect(monsterAreaCast(state, 50, golem(0))).toBe(A.Attack1);
    expect(monsterSwing(state, golem(500))).toBe(A.Attack1);
    expect(monsterSwing(state, golem(2000))).toBe(A.Attack2);
  });
});

describe('monsterMagic', () => {
  it('is the default choice counted once', () => {
    const state = fresh();
    expect([monsterMagic(state), monsterMagic(state), monsterMagic(state)]).toEqual([
      A.Attack1, A.Attack2, A.Attack2,
    ]);
    expect(state.swordCount).toBe(3);
  });
});

describe('playableMonsterClip', () => {
  it('plays a clip the model has', () => {
    expect(playableMonsterClip(A.Attack2, 10)).toBe(A.Attack2);
    expect(playableMonsterClip(A.Stop2, 2)).toBe(A.Stop2);
  });

  it('falls back to Attack1 for one it lacks', () => {
    expect(playableMonsterClip(A.Attack3, 7)).toBe(A.Attack1);
    expect(playableMonsterClip(A.Attack4, 9)).toBe(A.Attack1);
  });

  it('keeps the clip in hand without Attack1, without a model, or when told to', () => {
    expect(playableMonsterClip(A.Attack2, 2)).toBe(KEEP_CLIP);
    expect(playableMonsterClip(A.Attack2, undefined)).toBe(KEEP_CLIP);
    expect(playableMonsterClip(KEEP_CLIP, 10)).toBe(KEEP_CLIP);
  });
});

describe('monsterFlinches', () => {
  it('flinches on half the hits', () => {
    expect(monsterFlinches(false, 3, rolls(0.49))).toBe(true);
    expect(monsterFlinches(false, 3, rolls(0.5))).toBe(false);
  });

  it('never flinches Illusion of Kundun 7 on a plain hit', () => {
    expect(monsterFlinches(false, 275, rolls())).toBe(false);
  });

  it('always flinches on a hit with the success bit', () => {
    expect(monsterFlinches(true, 275, rolls())).toBe(true);
  });
});

describe('monsterAttackState', () => {
  it('keeps one state per owner', () => {
    const owner = {};
    const state = monsterAttackState(owner);
    state.swordCount = 5;
    expect(monsterAttackState(owner)).toBe(state);
    expect(monsterAttackState({})).toEqual(fresh());
  });
});
