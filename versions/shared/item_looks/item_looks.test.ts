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

// RenderPartObjectBody's mace and scepter branches (ZzzObject.cpp).
describe('the maces and scepters', () => {
  it('Elemental Mace: its hidden mesh 2 additive, in a grey pulse off the body, scrolling (:7055-7065)', () => {
    const l = r(Math.max(0, BODY.x * (Math.sin(T * 0.001) * 0.5 + 0.3)));
    expect(look(2, 7)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 2, kind: 'bright', light: [l, l, l], u: r(T * 0.001), v: r(-T * 0.0005) }],
    });
  });

  it('Battle Scepter: mesh 0 again at a pulsing BlendMeshLight (:7078-7085)', () => {
    expect(look(2, 8)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 0, kind: 'add', gain: r(Math.max(0, Math.sin(T * 0.001) * 0.6 + 0.4)) }],
    });
  });

  it('Master Scepter: mesh 0 again in blue, pulsing, then Chrome01 scrolling on mesh 1 (:7086-7097)', () => {
    expect(look(2, 9)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'add', light: [0.1, 0.3, 1], gain: r(Math.max(0, Math.sin(T * 0.001) * 0.6 + 0.4)) },
        { mesh: 1, kind: 'add', texture: 'Effect/Chrome01.OZJ', light: [0.6, 0.8, 1], v: r(T * 0.0003) },
      ],
    });
  });

  it('Great Scepter: mesh 2 additive only, scrolling (:7528-7539)', () => {
    expect(look(2, 10)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 2, kind: 'bright', u: r(T * 0.0005), v: r(T * 0.0005) }],
    });
  });

  it('Lord Scepter: Chrome01 on mesh 1 (:7540-7547)', () => {
    expect(look(2, 11)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add', ...CHROME }] });
  });

  it('Great Lord Scepter: meshes 1 and 3 again (:7925-7930)', () => {
    expect(look(2, 12)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add' }, { mesh: 3, kind: 'add' }] });
  });

  it('Soleil Scepter: unlit, with Chrome06 swept across it (:7576-7599)', () => {
    const s = r((T % 4000) * 0.0002 - 0.3);
    expect(look(2, 14)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'unlit' },
        { mesh: 0, kind: 'add', texture: 'Effect/Chrome06.OZJ', clamp: true, u: s, v: s },
      ],
    });
  });

  it('Frost Mace: mesh 1 additive only, mesh 2 again (:7128-7134)', () => {
    expect(look(2, 16)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'bright' }, { mesh: 2, kind: 'add' }] });
  });

  it('the Shining Scepter has none: its branch is the plain body (:7645-7648)', () => {
    expect(look(2, 15)).toBeNull();
  });
});

describe('the spears', () => {
  it('Dragon Spear: its hidden mesh 1 additive, scrolling (ZzzObject.cpp:7050-7054)', () => {
    expect(look(3, 10)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 1, kind: 'bright', u: r(T * 0.0001), v: r(T * 0.0005) }],
    });
  });

  it('the axes have no branch of their own', () => {
    for (let num = 0; num < 10; num++) expect(look(1, num)).toBeNull();
  });
});

// RenderPartObjectBody's staff branches (ZzzObject.cpp).
describe('the staffs', () => {
  it('Staff of Kundun: Chrome01 on mesh 1, mesh 0 again flickering, Chrome02 by CHROME4 on mesh 0 (:7906-7913)', () => {
    expect(look(5, 11)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 1, kind: 'add', ...CHROME },
        { mesh: 0, kind: 'add', gain: r(Math.max(0, Math.sin(T * 0.005))) },
        { mesh: 0, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4' },
      ],
    });
  });

  it('Grand Viper Staff: unlit, with energy01 swept across it (:7576-7599)', () => {
    const s = r((T % 2000) * 0.0002 - 0.3);
    expect(look(5, 12)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'unlit' },
        { mesh: 0, kind: 'add', texture: 'Effect/energy01.OZJ', clamp: true, u: s, v: s },
      ],
    });
  });

  it('Platina Staff: mesh 1 additive only, scrolling (:7657-7662)', () => {
    expect(look(5, 13)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 1, kind: 'bright', u: r(T * 0.0009), v: r(T * 0.0009) }],
    });
  });

  it('the Summoner\'s Demonic and Storm Blitz sticks: mesh 1 again, the second pulsing (:7914-7924)', () => {
    expect(look(5, 18)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add' }] });
    expect(look(5, 19)).toEqual({
      drawn: undefined,
      passes: [{ mesh: 1, kind: 'add', gain: r(Math.max(0, (Math.sin(T * 0.002) + 0.5) * 0.5)) }],
    });
  });

  it('Deadly Staff: mesh 1 again in pink (:7135-7142)', () => {
    expect(look(5, 30)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add', light: [1, 0.5, 0.5] }] });
  });

  it('Imperial Staff: mesh 1 again, then the socket bitmap three times on mesh 0, pulsing (:7143-7152)', () => {
    expect(look(5, 31)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 1, kind: 'add' },
        { mesh: 0, kind: 'add', texture: 'Item/soketmagic_stape02.OZJ', clamp: true, gain: r((Math.abs(Math.sin(T * 0.001)) + 0.1) * 3) },
      ],
    });
  });

  it('Merlin Staff: Chrome01 on mesh 0, mesh 2 again, mesh 3 twice (:7153-7160)', () => {
    expect(look(5, 32)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'add', ...CHROME },
        { mesh: 2, kind: 'add' },
        { mesh: 3, kind: 'add', gain: 2 },
      ],
    });
  });
});
