import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  monsterAreaCast,
  monsterAttackState,
  monsterCast,
  monsterCastAttacks,
  monsterCastRewinds,
  monsterMagic,
  monsterSwing,
  type MonsterAttackInput,
} from './monsterAttackClip';

/**
 * A monster's swing and cast clips as behaviour: every map, every monster and body a branch names
 * (and neighbours), the skills the branches read, the traps, with fixed rolls and the AttackTime
 * that clears `c->Skill`. Pinned before the skill branches left monsterAttackClip.ts; update on purpose.
 */
const SEQUENCE_HASH = 'f3593462b449f3026571cad485a56fc04dfd23793c27d42e18453e2732fae027';
const SKILLS_HASH = '78192e7af26f18d642bd4eb21766c66dab8d5eee58e5be92c2f781999df79142';

const NAMED = [
  145, 175, 183, 191, 261, 269, 147, 177, 185, 193, 263, 271, 148, 178, 186, 194, 264, 272, 149, 179, 187, 195,
  265, 273, 160, 180, 188, 196, 266, 274, 161, 181, 189, 197, 267, 275, 291, 364, 459, 507, 304, 305, 309, 549,
  550, 551, 552, 440, 340, 344, 345, 341, 349, 358, 359, 360, 361, 362, 363, 409, 410, 411, 412, 388, 391, 394,
  397, 400, 403, 350, 351, 352, 356, 357, 555, 454, 455, 456, 457, 458, 562, 563, 564, 565, 506, 508, 511, 513,
  518, 519, 509, 514, 515, 510, 517, 516, 504, 505,
];
const MONSTERS = [0, 3, 146, 290, 292, 560, ...NAMED];
const WORLDS = [0, 8, 9, 10, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 58, 59, 68, 69, 70, 71, 72, 73, 78, 79, 80];
const MODELS = [-1, 9, 32, 76, 77, 192, 201, 204];
const SKILLS = [0, 1, 2, 3, 4, 5, 7, 11, 16, 17, 26, 27, 28, 38, 50, 53, 55, 59, 63, 200, 201, 202, 237, 238, 239, 384, 490, 413];

/** A fixed roll stream, so `rand()` reads the same on every run. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('monster attack clips', () => {
  it('pick what they did', () => {
    const h = createHash('sha256');
    let seed = 1;
    const run = (world: number, monster: number, model: number, trapObject: number | undefined, skill: number) => {
      const owner = {};
      const state = monsterAttackState(owner);
      const random = lcg(seed++);
      const at = (now: number): MonsterAttackInput => ({ world, monster, model, trapObject, random, now });
      const out = [
        monsterCast(state, skill, at(0)),
        monsterSwing(state, at(100)),
        monsterSwing(state, at(1000)),
        monsterAreaCast(state, skill, at(1100)),
        monsterCast(state, skill, at(1200)),
        monsterSwing(state, at(1300)),
        monsterMagic(state),
        state.swordCount,
        state.skill,
        state.skillClearsAt,
      ];
      h.update(out.join(',') + ';');
    };
    for (const world of WORLDS)
      for (const monster of MONSTERS)
        for (const model of MODELS) for (const skill of SKILLS) run(world, monster, model, undefined, skill);
    for (const trap of [39, 40, 51, 52])
      for (const world of [0, 33, 56])
        for (const monster of [0, 145, 291])
          for (const model of MODELS) for (const skill of SKILLS) run(world, monster, model, trap, skill);
    expect(h.digest('hex')).toBe(SEQUENCE_HASH);
  });

  it('cast and rewind on the skills they did', () => {
    const skills = Array.from({ length: 1100 }, (_, i) => i - 1);
    expect(createHash('sha256').update(JSON.stringify(skills.map(s => [monsterCastAttacks(s), monsterCastRewinds(s)]))).digest('hex')).toBe(
      SKILLS_HASH
    );
  });
});
