import { describe, expect, it } from 'vitest';
import { MonsterActionType } from '../../objects/enum';
import { GAION_SWORDS, SWORD_SPRITES, THROWS } from './swords';
import { sample, sideFlight, stormFlight, type Vec } from './flights';

const LEFT01 = 0;
const LEFT02 = 1;
const RIGHT01 = 2;
const RIGHT02 = 3;
const MAIN01 = 4;
const at = (keys: Parameters<typeof sample>[0], rate: number): Vec => {
  const out: Vec = [NaN, NaN, NaN];
  sample(keys, rate, out);
  return out;
};
const deg = Math.PI / 180;

// CInterpolateContainer::GetCurrentValue (w_ObjectInfo.cpp:7-34): the first key holding the rate, lerped.
describe("the swords' interpolation keys", () => {
  const keys = [
    { from: 0, to: 0.5, a: [0, 0, 0], b: [10, 0, 0] },
    { from: 0.5, to: 1.01, a: [10, 0, 0], b: [10, 20, 0] },
  ] as const;

  it('lerps inside the key holding the rate and keeps the old value when none does', () => {
    expect(at(keys, 0.25)).toEqual([5, 0, 0]);
    expect(at(keys, 0.5)).toEqual([10, 0, 0]);
    const out: Vec = [1, 2, 3];
    expect(sample(keys, 1.2, out)).toBe(false);
    expect(out).toEqual([1, 2, 3]);
  });
});

// CreateEffect SubType 1 (ZzzEffect.cpp:5272-5610).
describe("Gaion's thrown side swords (SubType 1)", () => {
  const start: Vec = [0, 0, 100];
  const target: Vec = [1000, 0, 0];
  const head: Vec = [0, 0, 30];
  const D = Math.hypot(1000, 100);

  it('right02 dips 40 degrees off the target, then flies past it 24 degrees the other way, in 30 ticks', () => {
    const f = sideFlight(RIGHT02, start, target, [0, 0, 0], head);
    expect(f.ticks).toBe(30);
    expect(f.head).toEqual(head);
    const p1 = at(f.pos, 0.32);
    expect(p1[0]).toBeCloseTo(Math.cos(-40 * deg) * D * 0.4);
    expect(p1[1]).toBeCloseTo(Math.sin(-40 * deg) * D * 0.4);
    expect(p1[2]).toBeCloseTo(0);
    const end = at(f.pos, 1.0099);
    expect(end[0]).toBeCloseTo(Math.cos(24 * deg) * (D + 700), 0);
    expect(end[2]).toBeCloseTo(100 - 290, 0);
    expect(at(f.angle, 0.16)).toEqual([45, 0, 0]);
    expect(at(f.angle, 0.32)).toEqual([90, 0, 0]);
  });

  it('left02 turns the other way, 50 then -26 degrees, and tumbles to (60, 0, -300)', () => {
    const f = sideFlight(LEFT02, start, target, [0, 0, 0], head);
    const p1 = at(f.pos, 0.33);
    expect(p1[1]).toBeCloseTo(Math.sin(50 * deg) * D * 0.4);
    expect(at(f.pos, 1.0099)[2]).toBeCloseTo(100 - 280, 0);
    expect(at(f.angle, 0.4)).toEqual([110, 0, 0]);
    expect(at(f.angle, 1.0099)[2]).toBeCloseTo(-300, 0);
  });

  it('left01 and right01 run 1700 along the line from Gaion to the target, spinning 1560 degrees, in 35 ticks', () => {
    const owner: Vec = [-100, 0, 0];
    const right = sideFlight(RIGHT01, start, target, owner, head);
    const left = sideFlight(LEFT01, start, target, owner, head);
    expect(right.ticks).toBe(35);
    const first = (D * 0.3) / 1700;
    expect(right.pos[0]).toMatchObject({ from: 0, to: first, a: start });
    expect(right.pos[0].b[0]).toBeCloseTo(D * 0.3);
    expect(right.pos[0].b[2]).toBeCloseTo(100);
    expect(right.pos[1].b[0]).toBeCloseTo(1700);
    expect(right.angle[1].b).toEqual([90, 0, 1560]);
    expect(left.angle[1].b).toEqual([90, 0, -1560]);
  });
});

// CreateEffect SubType 3 (ZzzEffect.cpp:5040-5130): up 900 +-50, across, then down near the ground.
describe("Gaion's storm swords (SubType 3)", () => {
  it('climb, cross over the target and drop 120 above the ground there, each a little later than the last', () => {
    const half = () => 0.5;
    const f = stormFlight(RIGHT01, [0, 0, 100], [500, 300, 40], 40, [0, 0, 0], half);
    expect(f.ticks).toBe(60);
    expect(f.angle).toEqual([]);
    const o = 0.03 * 2;
    expect(f.pos.map(k => [k.from, k.to])).toEqual([[o, 0.22 + o], [0.22 + o, 0.35 + o], [0.35 + o, 0.5 + o], [0.5 + o, 1.01]]);
    expect(f.pos[0].b).toEqual([0, 0, 1000]);
    expect(f.pos[1].b).toEqual([500, 300, 1000]);
    expect(f.pos[2].b).toEqual([500, 300, 160]);
    expect(stormFlight(MAIN01, [0, 0, 100], [500, 300, 40], 40, [0, 0, 0], half).pos[0].from).toBeCloseTo(0.12);
  });
});

// MoveMonsterVisual (GMEmpireGuardian4.cpp:287-415).
describe("Gaion's throws by action", () => {
  it('throw left02 and right02 at the start of Attack1, left01 and right01 of Attack2, all five in Attack3', () => {
    expect(THROWS[MonsterActionType.Attack1]).toEqual({ until: 0.5, sub: 1, swords: [LEFT02, RIGHT02] });
    expect(THROWS[MonsterActionType.Attack2]).toEqual({ until: 0.7, sub: 1, swords: [LEFT01, RIGHT01] });
    expect(THROWS[MonsterActionType.Attack3]).toEqual({ until: 0.5, sub: 3, swords: [LEFT01, RIGHT01, LEFT02, RIGHT02, MAIN01] });
    // Each leaves from the body bone its held copy rides.
    expect(THROWS[MonsterActionType.Attack1]?.swords.map(i => GAION_SWORDS[i].bone)).toEqual([2, 10]);
  });
});

// RenderEffect (ZzzEffect.cpp:9405-9480): two red jewels and nine blue edge lights on every sword.
describe("the lights on Gaion's swords", () => {
  it('sit on each sword model own bones', () => {
    expect(SWORD_SPRITES.map(s => s.red)).toEqual([[2, 3], [9, 10], [1, 2], [3, 10], [10, 11]]);
    expect(SWORD_SPRITES[0].edge).toEqual([13, 12, 5, 6, 1, 8, 9, 10, 4]);
    expect(SWORD_SPRITES[4].edge).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
