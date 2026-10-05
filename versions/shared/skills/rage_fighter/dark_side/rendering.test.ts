import { describe, expect, it } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DarksideRendering, type DarksideSink, type DarksideState } from './rendering';

/**
 * CMonkSystem::DarksideRendering (MonkSystem.cpp:697-857) a call at a time, as RenderCharacter makes one a drawn body part
 * (ZzzCharacter.cpp:9572-9654). Positions in tiles (100 cm); the caster at the origin, targets along +z.
 */
interface Drawn {
  call: number;
  part: number;
  at: Vector3;
  angle: number;
  alpha: number;
}
interface Record {
  copies: Drawn[];
  dummies: Map<number, Drawn[]>;
  waves: { call: number; sub: 3 | 4; at: Vector3; angle: number; from: Vector3 }[];
  damages: { call: number; at: Vector3 }[];
}

function recorder(): { sink: DarksideSink; rec: Record; at: (call: number) => void } {
  let call = 0;
  const rec: Record = { copies: [], dummies: new Map(), waves: [], damages: [] };
  const sink: DarksideSink = {
    copy: (part, at, angle) => rec.copies.push({ call, part, at: at.clone(), angle, alpha: 1 }),
    dummy: (index, part, at, angle, alpha) => {
      const list = rec.dummies.get(index) ?? [];
      rec.dummies.set(index, list);
      list.push({ call, part, at: at.clone(), angle, alpha });
    },
    wave: (sub, at, angle, from) => rec.waves.push({ call, sub, at: at.clone(), angle, from: from.clone() }),
    damage: at => rec.damages.push({ call, at: at.clone() }),
  };
  return { sink, rec, at: n => (call = n) };
}

const state = (over: Partial<DarksideState> = {}): DarksideState => ({
  caster: new Vector3(0, 0, 0),
  frame: 3,
  targets: [new Vector3(0, 0, 4)],
  sent: 1,
  echoTarget: new Vector3(0, 0, 4),
  fast: false,
  ...over,
});

/** Afterimage `i` as drawn, call by call. */
const dummyOf = (rec: Record, i: number): Drawn[] => rec.dummies.get(i) ?? [];

/** `calls` calls of one part each, `s` read before each. */
function run(calls: number, s: (call: number) => DarksideState, parts = 1): Record {
  const r = new DarksideRendering();
  const { sink, rec, at } = recorder();
  for (let n = 1; n <= calls; n++) {
    at(n);
    r.call((n - 1) % parts, s(n), sink);
  }
  return rec;
}

describe('the afterimages (CDummyUnit, MonkSystem.cpp:1379-1498)', () => {
  it('none before a follow-up has gone (m_nDarksideCnt > 0, :765)', () => {
    expect(run(10, () => state({ sent: 0 })).dummies.size).toBe(0);
  });

  it('one a call while the caster\'s READY key passes 0, 2, 4, 6 and 8, five at most (:767-781)', () => {
    const first = (rec: Record, i: number) => rec.dummies.get(i)?.[0]?.call;
    const rec = run(60, n => state({ frame: n < 10 ? 3 : n < 20 ? 4.5 : 9 }));
    expect([0, 1, 2, 3, 4, 5].map(i => first(rec, i))).toEqual([1, 2, 10, 20, 21, undefined]);
  });

  it('each starts 150, 150 cm turned 60 degrees a dummy from its target, at its height, and runs at it (SetDummy :858-871)', () => {
    // The copy visits the one target on call 1, so the dummies are made on the echo's.
    const target = new Vector3(2, 0.3, 4);
    const rec = run(2, () => state({ targets: [target], echoTarget: target }));
    const start = (i: number, deg: number): Vector3 => {
      const a = (deg * Math.PI) / 180;
      return new Vector3(target.x + 1.5 * Math.cos(a) - 1.5 * Math.sin(a), target.y, target.z + 1.5 * Math.sin(a) + 1.5 * Math.cos(a));
    };
    for (const i of [0, 1]) {
      const s = start(i, 60 * i);
      const way = target.subtract(s).normalize();
      // Its first call moves it 0.49 cm on (CalDummyPosition: 0.7 x 0.7).
      const d = dummyOf(rec, i)[0];
      expect(d.at.subtract(s).subtract(way.scale(0.0049)).length()).toBeLessThan(1e-6);
      // Turned along its way: CreateAngle2D(start, position), MU degrees (ZzzAI.cpp:82-100).
      expect(d.angle).toBeCloseTo((Math.atan2(way.x, -way.z) * 180) / Math.PI + (way.x < 0 ? 360 : 0), 3);
    }
  });

  it('gains 0.49 cm a call on the last, fades in 0.02 a call to 0.6, out 0.07 a call past 300 cm, and is gone past 500 (IsDistance :1423-1457)', () => {
    const rec = run(60, () => state({ frame: 1 }));
    const d = dummyOf(rec, 0);
    const out = (n: number) => d[n - 1].at.subtract(d[0].at).length() * 100 + 0.49;
    expect(out(3)).toBeCloseTo(2.94, 3);
    expect(out(20)).toBeCloseTo(102.9, 1);
    // Float steps: it sits on 0.6 and 0.62 by turns until it is 300 cm out.
    expect([1, 10, 20, 21, 22, 35, 36, 43].map(n => +d[n - 1].alpha.toFixed(4))).toEqual([0.22, 0.4, 0.6, 0.62, 0.6, 0.62, 0.55, 0.06]);
    // Drawn on its calls 1-45 (the last two at or under 0), never again.
    expect(d.length).toBe(45);
    expect(d[44].alpha).toBeLessThanOrEqual(0);
  });

  it('Chaos Castle: 30 times as far a call (CalDummyPosition :1489-1493)', () => {
    const d = run(2, () => state({ frame: 1, fast: true })).dummies.get(0) ?? [];
    expect(d[1].at.subtract(d[0].at).length() * 100).toBeCloseTo(0.98 * 30, 2);
  });

  it('BITMAP_DAMAGE2 on the target on a dummy\'s calls 20 and 21, while a target is left to visit; the wave on calls 31 and 32 (:811-826)', () => {
    // A second target keeps EffectTotal over AttCnt; one dummy (frame 1).
    const targets = [new Vector3(0, 0, 4), new Vector3(3, 0, 0)];
    const rec = run(40, () => state({ frame: 1, sent: 0, targets }));
    expect(rec.damages).toEqual([]);
    const live = run(40, n => state({ frame: 1, sent: n >= 1 ? 1 : 0, targets }));
    // The copy has moved on to the second target (AttCnt 1): its burst is there.
    const fromDummy = live.damages.filter(d => d.call >= 20);
    expect(fromDummy.map(d => d.call)).toEqual([20, 21]);
    expect(fromDummy[0].at.equals(targets[1])).toBe(true);
    const waves = live.waves.filter(w => w.sub === 4);
    expect(waves.map(w => w.call)).toEqual([31, 32]);
    // At the dummy, at its way - 180, made from its start (the Owner's StartPosition, :802).
    const dummy = live.dummies.get(0) ?? [];
    expect(waves[0].at.equals(dummy[30].at)).toBe(true);
    expect(waves[0].angle).toBeCloseTo(dummy[30].angle - 180, 5);
    expect(waves[0].from.subtract(new Vector3(4.5, 0, 1.5)).length()).toBeLessThan(1e-6);
  });

  it('no burst once every target is visited (GetDarksideEffectTotal() > m_nDarksideEffectAttCnt, :822)', () => {
    const rec = run(40, () => state({ frame: 1, sent: 1 }));
    expect(rec.damages.filter(d => d.call >= 20)).toEqual([]);
    expect(rec.waves.filter(w => w.sub === 4).map(w => w.call)).toEqual([31, 32]);
  });

  it('with every target visited it is made on the echo\'s target; with none known it is never drawn (:769-776)', () => {
    const echo = new Vector3(5, 0, 5);
    const on = run(3, () => state({ frame: 1, targets: [], echoTarget: echo })).dummies.get(0) ?? [];
    expect(Vector3.Distance(on[0].at, echo)).toBeCloseTo(Math.hypot(1.5, 1.5) - 0.0049, 5);
    expect(run(3, () => state({ frame: 1, targets: [], echoTarget: null })).dummies.size).toBe(0);
  });

  it('each drawn part of a call moves it on: the parts of one tick stand apart (ZzzCharacter.cpp:9572-9646)', () => {
    const rec = run(5, () => state({ frame: 1 }), 5);
    expect(dummyOf(rec, 0).map(d => d.part)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('the body running out to each target in turn (:711-763)', () => {
  it('f x f x 0.05 cm out on call f toward the next target, turned to it, at full alpha (CalculateDarksideTrans :646-695)', () => {
    const target = new Vector3(0, 0, 4);
    const rec = run(10, () => state({ sent: 0, targets: [target] }));
    expect(rec.copies.map(c => +(c.at.z * 100).toFixed(2))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(f => +(f * f * 0.05).toFixed(2)));
    expect(rec.copies[0].angle).toBeCloseTo(180, 5);
  });

  it('its wave once it is past 30 cm (call 25), made from the caster: MODEL_SHOCKWAVE01 sub3 at its way - 180 (:736-742)', () => {
    const rec = run(40, () => state({ sent: 0, targets: [new Vector3(0, 0, 4)] }));
    const waves = rec.waves.filter(w => w.sub === 3);
    expect(waves.map(w => w.call)).toEqual([25]);
    expect(waves[0].at.equals(rec.copies[24].at)).toBe(true);
    expect(waves[0].angle).toBeCloseTo(0, 5);
    expect(waves[0].from.equals(Vector3.Zero())).toBe(true);
  });

  it('BITMAP_DAMAGE2 on the target on the last call before it passes it (m_bDarkSideEffOnce, :685-692, :743-747)', () => {
    // 50 cm out: call 31 stands at 48.05 cm and call 32 would at 51.2.
    const rec = run(40, () => state({ sent: 0, targets: [new Vector3(0, 0, 0.5)] }));
    expect(rec.damages.map(d => d.call)).toEqual([31]);
  });

  it('on to the next target, from the caster again, once a follow-up has gone (:749-757)', () => {
    const targets = [new Vector3(0, 0, 4), new Vector3(4, 0, 0)];
    const rec = run(6, n => state({ sent: n >= 4 ? 1 : 0, targets, frame: 0 }));
    // Call 4 is still drawn toward the first; call 5 starts over toward the second.
    expect(rec.copies.map(c => [+(c.at.x * 100).toFixed(2), +(c.at.z * 100).toFixed(2)])).toEqual([
      [0, 0.05],
      [0, 0.2],
      [0, 0.45],
      [0, 0.8],
      [0.05, 0],
      [0.2, 0],
    ]);
    const done = run(3, () => state({ sent: 2, targets, frame: 0 }));
    expect(done.copies.length).toBe(2);
  });

  it('starts over when the targets come again (InitDarksideTarget, :615-639)', () => {
    const r = new DarksideRendering();
    const { sink, rec, at } = recorder();
    const s = state({ sent: 0, frame: 0 });
    for (let n = 1; n <= 3; n++) {
      at(n);
      r.call(0, s, sink);
    }
    r.resetTargets();
    at(4);
    r.call(0, s, sink);
    expect(rec.copies.map(c => +(c.at.z * 100).toFixed(2))).toEqual([0.05, 0.2, 0.45, 0.05]);
  });
});
