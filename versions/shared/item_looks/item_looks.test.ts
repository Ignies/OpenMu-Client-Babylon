import { describe, expect, it } from 'vitest';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { itemBodyPasses } from '@/controllers/item_fx/itemLooks';
import './index';

/** A sample WorldTime (ms) and body light the passes are read at. */
const T = 1234;
const BODY = new Vector3(0.5, 0.6, 0.7);

/** Every pass of an item's look, its functions read at `T` on `BODY`. */
function look(group: number, num: number) {
  const set = itemBodyPasses(group, num);
  if (!set) return null;
  const passes = set.passes.map(({ light, gain, u, v, ...rest }) => {
    const out: Record<string, unknown> = { ...rest };
    if (light) {
      const l = new Vector3();
      light(T, BODY, l);
      out.light = [l.x, l.y, l.z].map(n => +n.toFixed(4));
    }
    if (gain) out.gain = +gain(T).toFixed(4);
    if (u) out.u = +u(T).toFixed(4);
    if (v) out.v = +v(T).toFixed(4);
    return out;
  });
  return { drawn: set.drawn, passes };
}

const r = (n: number) => +n.toFixed(4);
const CHROME = { texture: 'Effect/Chrome01.OZJ', map: 'chrome' };

// RenderPartObjectBody's sword branches (ZzzObject.cpp).
describe('the swords', () => {
  it('Rune Blade: mesh 1 again additive, mesh 0 opaque Chrome01, mesh 2 a grey scrolling glow (:7035-7049)', () => {
    const l = r(BODY.x * (Math.sin(T * 0.001) * 0.5 + 0.5));
    expect(look(0, 31)).toEqual({
      drawn: [1, 3],
      passes: [
        { mesh: 1, kind: 'add' },
        { mesh: 0, kind: 'unlit', ...CHROME },
        { mesh: 2, kind: 'bright', light: [l, l, l], u: r(T * 0.0001), v: r(-T * 0.0005) },
      ],
    });
  });

  it('Knight Blade: blades 2 and 1 again, 2 pulsing, Chrome01 on 3 (:7548-7557)', () => {
    expect(look(0, 20)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 2, kind: 'add', gain: r(Math.max(0, Math.sin(T * 0.0008) * 0.7 + 0.5)) },
        { mesh: 1, kind: 'add' },
        { mesh: 3, kind: 'add', ...CHROME },
      ],
    });
  });

  it('Dark Reign Blade: mesh 0 again scrolling, mesh 1 unlit and scrolling (:7558-7565)', () => {
    expect(look(0, 21)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'add', u: r(T * 0.0005), v: r(T * 0.0005) },
        { mesh: 1, kind: 'unlit', v: r(T * 0.0005) },
      ],
    });
  });

  it('Bone Blade: unlit, with Chrome07 swept across it in amber (:7576-7599)', () => {
    expect(look(0, 22)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'unlit' },
        { mesh: 0, kind: 'add', texture: 'Effect/Chrome07.OZJ', clamp: true, light: [1, 0.7, 0.4], u: r((T % 4000) * 0.0004 - 0.7) },
      ],
    });
  });

  it('Explosion Blade: mesh 0 again, 2 in a faint blue pulse, 1 in blue (:7600-7613)', () => {
    const l = Math.sin(T * 0.0015) * 0.03 + 0.3;
    expect(look(0, 23)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'add' },
        { mesh: 2, kind: 'add', light: [r(l), r(l), r(l + 0.1)] },
        { mesh: 1, kind: 'add', light: [0.4, 0.4, 0.8] },
      ],
    });
  });

  it('Sword Dancer: mesh 1 as half lava, then itself additive and scrolling (:7638-7644)', () => {
    expect(look(0, 25)).toEqual({
      drawn: [0],
      passes: [
        { mesh: 1, kind: 'blend', texture: 'Effect/lava.OZJ', clamp: true, alpha: 0.5 },
        { mesh: 1, kind: 'add', v: r(T * 0.0009) },
      ],
    });
  });

  it('Flamberge: a red blade with Chrome01, two bright pieces and a four-frame strip (:7098-7114)', () => {
    expect(look(0, 26)).toEqual({
      drawn: [0, 2],
      passes: [
        { mesh: 1, kind: 'bright', light: [1, 0, 0.2] },
        { mesh: 1, kind: 'add', ...CHROME, light: [1, 1, 1] },
        { mesh: 3, kind: 'bright', light: [1, 1, 1] },
        { mesh: 4, kind: 'bright', light: [1, 1, 1] },
        { mesh: 5, kind: 'bright', light: [1, 1, 1], v: Math.floor((Math.floor(T * 0.05) % 16) / 4) * 0.25 },
      ],
    });
  });

  it('Sword Breaker: Chrome01 on mesh 1 (:7115-7119)', () => {
    expect(look(0, 27)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add', ...CHROME }] });
  });

  it('Imperial Sword: mesh 2 again, mesh 1 again pulsing (:7120-7127)', () => {
    expect(look(0, 28)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 2, kind: 'add' },
        { mesh: 1, kind: 'add', gain: r(Math.max(0, Math.sin(T * 0.001) * 0.6 + 0.4)) },
      ],
    });
  });

  it('every other sword has none', () => {
    expect(look(0, 0)).toBeNull();
    expect(look(0, 19)).toBeNull();
  });
});
