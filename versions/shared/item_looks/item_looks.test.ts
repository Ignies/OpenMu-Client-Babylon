import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { itemBodyPasses, itemHeldSprites, itemWingSprites } from '@/controllers/item_fx/itemLooks';
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

/**
 * Every sprite a carried item draws, read at `T` on `BODY`, as `[sheet, bone, point, scale, light,
 * rotation]`; `rand()` is `Math.random()`, stubbed to `RAND`.
 */
const RAND = 0.5;
function held(group: number, num: number, of = itemHeldSprites) {
  const random = vi.spyOn(Math, 'random').mockReturnValue(RAND);
  const v = new Vector3();
  const rows = of(group, num)?.map(s => {
    let point: number[] | undefined;
    if (typeof s.offset === 'function') {
      s.offset(T, v);
      point = [v.x, v.y, v.z].map(r);
    } else point = s.offset ? [...s.offset] : undefined;
    let light: number[];
    if (typeof s.light === 'function') {
      s.light(T, BODY, v);
      light = [v.x, v.y, v.z].map(r);
    } else light = [...s.light];
    const scale = r(typeof s.scale === 'number' ? s.scale : s.scale(T));
    return [s.texture, s.bone, point, scale, light, s.rotation ? r(s.rotation(T)) : 0];
  });
  random.mockRestore();
  return rows ?? null;
}
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
    expect(look(0, 1)).toBeNull(); // the Archangel sword (0, 19) has its own, below
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

describe('the bows', () => {
  it('Sylph Wind Bow: unlit, with Chrome06 swept across it (ZzzObject.cpp:7576-7599)', () => {
    const s = r((T % 4000) * 0.0002 - 0.3);
    expect(look(4, 21)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'unlit' },
        { mesh: 0, kind: 'add', texture: 'Effect/Chrome06.OZJ', clamp: true, u: s, v: s },
      ],
    });
  });

  it('Albatross Bow: mesh 1 additive only, mesh 2 again and its own art by CHROME5 at half (:7649-7656)', () => {
    expect(look(4, 22)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 1, kind: 'bright' },
        { mesh: 2, kind: 'add' },
        { mesh: 2, kind: 'add', map: 'chrome5', gain: 0.5 },
      ],
    });
  });
});

describe('the armour sets', () => {
  it('Hurricane: bab2 by the chrome look-up over every drawn mesh, in a cyan off the body (ZzzObject.cpp:7566-7575)', () => {
    const hurricane = { drawn: undefined, passes: [{ mesh: -1, kind: 'add', texture: 'Effect/bab2.OZJ', map: 'chrome', light: [r(BODY.x * 0.3), r(BODY.y * 0.8), BODY.y] }] };
    for (const group of [8, 9, 10, 11]) expect(look(group, 23)).toEqual(hurricane);
    expect(look(7, 23)).toBeNull(); // the branch names no helm
  });
});

describe('the Dark Lord\'s pet items', () => {
  it('Dark Horse horn: Chrome01 over every mesh in orange; Dark Raven: over mesh 0 in cyan (ZzzObject.cpp:7066-7077)', () => {
    expect(look(13, 4)).toEqual({ drawn: undefined, passes: [{ mesh: -1, kind: 'add', ...CHROME, light: [0.8, 0.4, 0.1] }] });
    expect(look(13, 5)).toEqual({ drawn: undefined, passes: [{ mesh: 0, kind: 'add', ...CHROME, light: [0.3, 0.8, 1] }] });
  });
});

// RenderLinkObject's sword cases (ZzzCharacter.cpp): the sprites a carried sword draws every frame.
describe('the swords\' held sprites', () => {
  it('Bone Blade: two Impack03 glints at the hilt in a flickering red (:7129-7142)', () => {
    const f = Math.sin(T * 0.4) * 0.25 + 0.7;
    const light = [r(f), r(f - 0.5), r(f - 0.5)];
    expect(held(0, 22)).toEqual([
      ['impact03', 0, [5, -22, -10], 0.75, light, 0],
      ['impact03', 0, [-5, -22, -10], 0.75, light, 0],
    ]);
  });

  it('Explosion Blade: two turning Shiny02 at a jittering point of bone 4 and flares down the blade (:7143-7175)', () => {
    const jitter = r(Math.floor(RAND * 60) / 20 - 1.5);
    const size = r(Math.floor(RAND * 30) / 20 + 1.5);
    const turn = r(T * 0.0006 * 360);
    const light = [0.2, 0.2, r(Math.sin(T * 0.7) * 0.2 + 0.5)];
    const at = [0, jitter, jitter];
    expect(held(0, 23)).toEqual([
      ['shiny02', 4, at, size, light, turn],
      ['shiny02', 4, at, r(size - 0.4), light, r(90 + turn)],
      ['flare01', 4, at, 2.3, light, 0],
      ['flare01', 4, [30, 0, 0], 2, light, 0],
      ['flare01', 6, undefined, 2, light, 0],
      ['flare01', 7, undefined, 2, light, 0],
      ['flare01', 8, undefined, 1, light, 0],
    ]);
  });

  it('Sword Dancer: a red flare and impact at bone 1, a drop running down one bone a cycle, flares on 2-6 (:7255-7318)', () => {
    const rows = held(0, 25) ?? [];
    const f = Math.sin(T * 0.7) * 0.2 + 0.3;
    const f2 = Math.sin(T * 0.4) * 0.25 + 0.2;
    expect(rows.slice(0, 2)).toEqual([
      ['flare01', 1, undefined, 1, [1, 0.1, 0], 0],
      ['impact01', 1, undefined, r(Math.floor(RAND * 30) / 60 + 0.2), [r(0.1 + f), 0.2, 0], r(T * 0.0006 * 360)],
    ]);
    // The drop: on one of bones 2-6 a cycle, 1.5 cm further down each 25 Hz frame, the rest drawn at 0.
    const frame = Math.floor(T / 40);
    const drop = rows.slice(2, 12);
    const shown = drop.filter(row => (row[3] as number) > 0);
    expect(shown).toHaveLength(2);
    expect(shown[0]).toEqual(['waterfall4', shown[0][1], [0, ((frame % 15) + 1) * 1.5, 0], 0.7, [r(1 - f), 0, 0], 0]);
    expect(shown[1]).toEqual(['waterfall2', shown[0][1], [0, ((frame % 15) + 1) * 1.5, 0], 0.3, [0.1, 0.1, 0.1], 0]);
    expect(drop.map(row => row[1])).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    expect(rows.slice(12)).toEqual([2, 3, 4, 5, 6].map(bone => ['flare01', bone, undefined, 1.1, [r(0.8 + f2), 0.1, 0], 0]));
  });

  it('Knight Blade: a violet flare and a grey one on bones 1 and 2 (:7661-7673)', () => {
    const l = Math.sin(T * 0.002) * 0.35 + 0.65;
    const grey = r(Math.abs(Math.sin(T * 0.002) * 0.5 + 0.4)); // a negative scale draws the sprite mirrored
    const pair = (bone: number) => [
      ['flare01', bone, undefined, r(l * 0.9), [r(l * 0.43), r(l * 0.14), r(l * 0.6)], 0],
      ['flare01', bone, undefined, grey, [0.3, 0.3, 0.3], 0],
    ];
    expect(held(0, 20)).toEqual([...pair(1), ...pair(2)]);
  });

  it('Flamberge: gold and teal flares at its gems, red light marks down the blade (:7731-7764)', () => {
    const gold = [0.8, 0.6, 0.2];
    const teal = [0.3, 0.8, 0.7];
    const red = [0.9, 0.1, 0.1];
    expect(held(0, 26)).toEqual([
      ['flare01', 11, undefined, 0.6, gold, 0],
      ['flare01', 11, undefined, 0.6, gold, 0],
      ['flare01', 12, undefined, 0.5, teal, 0],
      ['flare01', 13, undefined, 0.5, teal, 0],
      ['flare01', 12, undefined, 0.3, teal, 0],
      ['flare01', 13, undefined, 0.3, teal, 0],
      ...[0.8, 0.7, 0.7, 0.7, 0.6, 0.5, 0.5].map((scale, i) => ['lightmarks', i + 1, undefined, scale, red, 0]),
    ]);
  });

  it('Sword Breaker: green light marks down the blade (:7765-7795)', () => {
    expect(held(0, 27)).toEqual(
      [0.6, 0.5, 0.5, 0.5, 0.4, 0.3, 0.3].map((scale, i) => ['lightmarks', i + 1, undefined, scale, [0.1, 0.9, 0.1], 0])
    );
  });

  it('Imperial Sword: blue flares in the wearer\'s light and shiny05 on bones 8-11, blue light marks on 2-7 (:7796-7839)', () => {
    const size = r(Math.floor(RAND * 15) / 30 + 0.5);
    const body = [BODY.x, BODY.y, BODY.z].map(r);
    const blue = [0.1, 0.4, 0.9];
    expect(held(0, 28)).toEqual([
      ...[8, 9, 10, 11].flatMap(bone => [
        ['flareBlue', bone, undefined, 0.4, body, 0],
        ['shiny05', bone, undefined, bone < 10 ? size : 0.4, blue, 0],
      ]),
      ...[1, 0.8, 0.6, 0.4, 0.2, 0.1].map((scale, i) => ['lightmarks', i + 2, undefined, scale, [0, 0.3, 0.7], 0]),
    ]);
  });

  it('the Dark Reign and Rune blades draw only their running sparks, not yet ported (:7698-7720)', () => {
    expect(held(0, 21)).toBeNull();
    expect(held(0, 31)).toBeNull();
  });
});

// RenderLinkObject's mace and spear cases (ZzzCharacter.cpp); `Luminosity` is rolled once a frame (:7029).
describe('the maces\' and spears\' held sprites', () => {
  const lum = (Math.floor(RAND * 30) + 70) * 0.005;

  it('Elemental Mace: a big gold flare and a pulsing grey one on bone 1 (:7566-7575)', () => {
    expect(held(2, 7)).toEqual([
      ['flare01', 1, undefined, 2, [r(lum), r(lum * 0.9), 0], 0],
      ['flare01', 1, undefined, r(Math.abs(Math.sin(T * 0.002) + 0.5)), [0.5, 0.5, 0.5], 0],
    ]);
  });

  it('Frost Mace: shiny05 at its gems, a frost star of flare and three turning pin lights at bone 24, flares up the shaft (:7840-7927)', () => {
    const green = [0.5, 0.8, 0.5];
    const red = [0.9, 0.1, 0.3];
    const frost = [0.5, 0.8, 0.6];
    expect(held(2, 16)).toEqual([
      ['shiny05', 11, undefined, 0.2, green, 0],
      ['shiny05', 10, undefined, 0.2, green, 0],
      ['shiny05', 9, undefined, 0.2, red, 0],
      ['shiny05', 8, undefined, 0.2, red, 0],
      ['shiny05', 1, undefined, 0.2, red, 0],
      ['flare01', 1, undefined, 0.8, red, 0],
      ['shiny05', 24, undefined, 0.3, frost, 0],
      ['flare01', 24, undefined, 2, frost, 0],
      ['pinLight', 24, undefined, 0.5, frost, Math.floor(T * 0.04) % 360],
      ['pinLight', 24, undefined, 0.7, frost, -(Math.floor(T * 0.03) % 360)],
      ['pinLight', 24, undefined, 0.9, frost, Math.floor(T * 0.02) % 360],
      ...[0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.4, 0.4].map((scale, i) => ['flare01', i + 12, undefined, scale, frost, 0]),
    ]);
  });

  it('Dragon Spear: blue flares on bones 1-8 (:7721-7730)', () => {
    const light = [r(lum * 0.2), r(lum * 0.1), r(lum * 0.8)];
    expect(held(3, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map(bone => ['flare01', bone, undefined, 1.3, light, 0]));
  });

});

// RenderLinkObject's bow and crossbow cases (ZzzCharacter.cpp); `Luminosity` is rolled once a frame (:7029).
describe('the bows\' held sprites', () => {
  const lum = (Math.floor(RAND * 30) + 70) * 0.005;
  const times = (r0: number, g: number, b: number) => [r(lum * r0), r(lum * g), r(lum * b)];

  it('Tiger and Silver bows: amber Shiny02 on bones 2 and 6 (RenderBrightEffect, :7032-7059)', () => {
    const rows = [2, 6].map(bone => ['shiny02', bone, undefined, 1, times(1, 0.6, 0.2), 0]);
    expect(held(4, 4)).toEqual(rows);
    expect(held(4, 5)).toEqual(rows);
  });

  it('Chaos Nature Bow: green Shiny02 on bones 13-18 (:7036-7042)', () => {
    expect(held(4, 6)).toEqual([13, 14, 15, 16, 17, 18].map(bone => ['shiny02', bone, undefined, 1, times(0.6, 1, 0.8), 0]));
  });

  it('Celestial Bow: blue Shiny02 on bones 13-18 and 5-8 (:7043-7052)', () => {
    expect(held(4, 17)).toEqual([13, 14, 15, 16, 17, 18, 5, 6, 7, 8].map(bone => ['shiny02', bone, undefined, 1, times(0.5, 0.5, 0.8), 0]));
  });

  it('Sylph Wind Bow: yellow flares on bones 7 and 15, three at the grip (:7077-7103)', () => {
    expect(held(4, 21)).toEqual([
      ['flare01', 7, undefined, 2, [0.5, 0.5, 0.1], 0],
      ['flare01', 15, undefined, 2, [0.5, 0.5, 0.1], 0],
      ['flare01', 0, [20, 0, 0], 0.8, [1, 1, 0.4], 0],
      ['flare01', 0, [20, 0, 0], 1.3, [1, 1, 0.4], 0],
      ['flare01', 0, [20, 0, 0], 2, [1, 1, 0.4], 0],
    ]);
  });

  it('Albatross Bow: green flares on bones 10, 28, 34 and 16 (:7344-7376)', () => {
    expect(held(4, 22)).toEqual([10, 28, 34, 16].map(bone => ['flare01', bone, undefined, 1.2, [0, 0.7, 0], 0]));
  });

  it('Arrow Viper Bow: red flares on bones 6 and 2, a turning star at bone 9 out of a safe zone (:7674-7697)', () => {
    const scale = r((Math.sin(T * 0.001) + 1) * 0.8);
    const red = [r(lum * 3), r(lum), r(lum)]; // RenderSprite packs it to 1
    const l = Math.sin(T * 0.001) * 0.3 + 0.3;
    const turn = Math.sin(T * 0.01) * 360;
    expect(held(4, 20)).toEqual([
      ['flare01', 6, undefined, scale, red, 0],
      ['flare01', 2, undefined, scale, red, 0],
      ['flare01', 9, [10, 0, 0], scale, [r(l), r(l), r(l)], 0],
      ['shiny02', 9, [10, 0, 0], 0.8, [r(l * 3), r(l), r(l)], r(360 - turn)],
      ['shiny02', 9, [10, 0, 0], 0.8, [r(l * 3), r(l), r(l)], r(turn)],
    ]);
    const star = itemHeldSprites(4, 20)?.slice(2) ?? [];
    expect(star.map(s => s.when?.({ action: 0, safeZone: true }))).toEqual([false, false, false]);
    expect(star.map(s => s.when?.({ action: 0, safeZone: false }))).toEqual([true, true, true]);
  });

  it('Stinger Bow: a grey flare on every bone 0-43 but 1 (:7970-7983)', () => {
    const bones = Array.from({ length: 44 }, (_, i) => i).filter(i => i !== 1);
    expect(held(4, 23)).toEqual(bones.map(bone => ['flare01', bone, undefined, 0.8, [0.2, 0.25, 0.3], 0]));
  });

  it('Air Lyn Bow: two flares and two pulsing shock waves on bones 7 and 11, flares on 22-29 while attacking (:8345-8385)', () => {
    const wave = (rate: number, mod: number, add: number) => {
      const a = (Math.PI / 180) * ((Math.floor(T * rate) % mod) + add);
      const theta = Math.abs(Math.sin(a + Math.PI / 2));
      return [r(Math.abs(Math.sin(a)) * 0.3), [r(0.2 * theta), r(0.8 * theta), r(0.5 * theta)]];
    };
    const [s1, l1] = wave(0.02, 90, 0);
    const [s2, l2] = wave(0.05, 60, 30);
    const green = [0.2, 0.8, 0.5];
    expect(held(4, 24)).toEqual([
      ...[7, 11].flatMap(bone => [
        ['flare01', bone, undefined, 0.8, green, 0],
        ['flare01', bone, undefined, 0.8, green, 0],
        ['shockWave', bone, undefined, s1, l1, 0],
        ['shockWave', bone, undefined, s2, l2, 0],
      ]),
      ...[22, 23, 24, 25, 26, 27, 28, 29].map(bone => ['flare', bone, undefined, 0.4, green, 0]),
    ]);
    const attack = itemHeldSprites(4, 24)?.[8].when;
    expect(attack?.({ action: 38, safeZone: false })).toBe(true); // PLAYER_ATTACK_FIST
    expect(attack?.({ action: 155, safeZone: false })).toBe(true); // PLAYER_RIDE_SKILL
    expect(attack?.({ action: 15, safeZone: false })).toBe(false);
  });

  it('Great Reign Crossbow: blue Shiny02 and flares on bones 1-5, the last flare white (:7539-7557)', () => {
    const blue = times(0.5, 0.5, 0.8);
    expect(held(4, 19)).toEqual(
      [1, 2, 3, 4, 5].flatMap(bone => [
        ['shiny02', bone, [0, 0, 10], 1, blue, 0],
        ['flare01', bone, [0, 0, 10], 2, bone === 5 ? [1, 1, 1] : blue, 0],
      ])
    );
  });

  it('the Divine Crossbow of Archangel draws none (its case is commented out, :7521-7538)', () => {
    expect(held(4, 18)).toBeNull();
  });
});

// RenderLinkObject's staff cases (ZzzCharacter.cpp); every rand() reads RAND.
describe('the staffs\' held sprites', () => {
  const turn = r(T * 0.0006 * 360);

  it('Grand Viper Staff: Spark03, a flare and two Shiny02 at the head\'s jittered point, three violet stars (:7176-7223)', () => {
    const j = Math.floor(RAND * 60) / 20 - 1.5;
    const at = [0, r(-170 + j), r(j)];
    const glow = r(Math.floor(RAND * 15) / 20 + 1);
    const l = Math.sin(T * 0.7) * 0.2 + 0.5;
    const violet = [r(l - 0.1), 0.1, r(l - 0.1)];
    const star = (bone: number, point: number[], big: number, small: number) => [
      ['shiny02', bone, point, big, violet, turn],
      ['shiny02', bone, point, small, violet, r(90 + turn)],
    ];
    expect(held(5, 12)).toEqual([
      ['spark03', 0, at, r(Math.floor(RAND * 15) / 20 + 1.8), [0.4, 0.4, 0.4], 0],
      ['flare01', 0, at, glow, [1, 0.4, 1], 0],
      ['shiny02', 0, at, glow, [1, 0.4, 1], 0],
      ['shiny02', 0, at, r(glow - 0.3), [1, 0.4, 1], 90],
      ...star(2, [0, 10, 0], 1.5, 1.2),
      ...star(1, [-40, -10, 0], 1, 0.7),
      ...star(1, [-160, -5, 0], 1.2, 1),
    ]);
  });

  it('Platina Staff: flares, a Shiny02 and a magic circle at bone 9, beads on 5-8 and 10-13, a star at 4, a circle at 2 (:7377-7443)', () => {
    const f = Math.sin(T * 0.7) * 0.2 + 0.3;
    const fs = Math.floor(RAND * 10) / 500;
    expect(held(5, 13)).toEqual([
      ['flare01', 9, undefined, r(0.3 + fs), [0.7, 0.7, 0.7], 0],
      ['flare01', 9, undefined, r(4 + fs), [0.2, r(0.6 + f), 0.2], 0],
      ['shiny02', 9, undefined, r(1.2 + Math.floor(RAND * 30) / 60), [0.4, r(0.5 + f), 0.4], r(-(T * 0.0004 * 360))],
      ['magicGround1', 9, undefined, r(0.25 + fs), [0.6, 1, 0.6], turn],
      ...[0, 1, 2, 3].flatMap(i => [
        ['flare01', 5 + i, undefined, 0.2, [0.1, 0.8, 0.1], 0],
        ['flare01', 10 + i, undefined, 0.3, [0.5, 0.5, 0.5], 0],
      ]),
      ['shiny02', 4, undefined, r(0.6 + fs), [0.1, 0.8, 0.1], turn],
      ['magicGround1', 2, undefined, r(0.15 + fs), [0.6, 1, 0.6], turn],
      ['flare01', 2, undefined, r(0.7 + fs), [0.8, 0.8, 0.8], -turn],
      ['shiny02', 2, undefined, r(0.5 + fs), [0.1, 1, 0.1], turn],
      ['flare01', 2, undefined, r(2 + fs), [0.2, r(0.6 + f), 0.2], 0],
    ]);
  });

  it('Staff of Kundun: a pulsing blue flare and two counter-turned Shiny02 on bones 5, 6 and 8 (:7444-7473)', () => {
    const l = Math.sin(T * 0.002) * 0.3 + 0.7;
    const spin = Math.floor(RAND * 360);
    const gem = (bone: number, flare: number, star: number) => [
      ['flare01', bone, undefined, flare, [0, r(l * 0.5), r(l)], 0],
      ['shiny02', bone, undefined, star, [0.5, 0.5, 0.5], spin],
      ['shiny02', bone, undefined, star, [0.5, 0.5, 0.5], 360 - spin],
    ];
    expect(held(5, 11)).toEqual([...gem(5, 1, 0.5), ...gem(6, 1, 0.5), ...gem(8, 2, 1)]);
  });

  it('Deadly Staff: orange flares on bones 4-9, a pulsing red flare and shiny05 on 2 and 3 (:7998-8034)', () => {
    const l = Math.abs(Math.sin(T * 0.001)) * 0.8 + 0.2;
    const ember = [r(l * 0.8), r(l * 0.1), r(l * 0.3)];
    const shine = r(Math.floor(RAND * 10) / 20 + 0.8);
    expect(held(5, 30)).toEqual([
      ...[0.8, 0.4, 0.8, 0.8, 2, 0.8].map((scale, i) => ['flare01', i + 4, undefined, scale, [0.8, 0.3, 0.1], 0]),
      ...[2, 3].flatMap(bone => [
        ['flare01', bone, undefined, 2, ember, 0],
        ['shiny05', bone, undefined, shine, [0.8, 0.2, 0.4], 0],
      ]),
    ]);
  });

  it('Imperial Staff: blue flares on bones 2-4, a red flare, shiny05, two Shiny02 and Shiny03 at 5 (:8035-8071)', () => {
    const size = r(Math.floor(RAND * 15) / 20 + 1);
    const blue = [0.3, 0.3, 0.9];
    const pink = [0.9, 0.3, 0.5];
    expect(held(5, 31)).toEqual([
      ['flare01', 2, undefined, 2, blue, 0],
      ['flare01', 2, undefined, 2, blue, 0],
      ['flare01', 3, undefined, 2.5, blue, 0],
      ['flare01', 3, undefined, 2.5, blue, 0],
      ['flare01', 4, undefined, 3, blue, 0],
      ['flare01', 5, undefined, 2, [0.7, 0.1, 0.2], 0],
      ['shiny05', 5, undefined, 0.8, pink, 0],
      ['shiny02', 5, undefined, size, pink, 0],
      ['shiny02', 5, undefined, r(size - 0.3), pink, 90],
      ['shiny03', 5, undefined, 2, [0.7, 0.7, 0.7], 0],
    ]);
  });

  it('Staff 32: a red shine, marks, a flare and two shock waves at bone 1, the second growing and fading (:8072-8115)', () => {
    const frame = Math.floor(T / 40) % 76; // Timer: 0.15 up 0.01 a frame, reset past 0.9
    const fade = 0.95 ** Math.max(0, frame - 35);
    const red = [1, 0.1, 0.2];
    expect(held(5, 32)).toEqual([
      ['shiny05', 1, undefined, 0.7, red, 0],
      ['lightmarks', 1, undefined, 0.6, red, 0],
      ['flare01', 1, undefined, 2, red, 0],
      ['shockWave', 1, undefined, 0.65, [0.7, 0.1, 0.6], -(Math.floor(T * 0.05) % 360)],
      ['shockWave', 1, undefined, r(0.15 + frame * 0.01), [r(0.7 * fade), r(0.1 * fade), r(0.6 * fade)], 0],
      ['lightmarks', 1, undefined, r(Math.floor(RAND * 5) / 25 + 0.3), [0.9, 0.5, 0.2], 0],
      ['shiny05', 2, undefined, 0.3, [0.9, 0.7, 0.4], 0],
      ['lightmarks', 2, undefined, 0.4, [0.9, 0.1, 0.3], 0],
      ['shiny05', 3, undefined, 0.2, [0.9, 0.7, 0.4], 0],
      ['lightmarks', 3, undefined, 0.3, [0.9, 0.1, 0.3], 0],
    ]);
  });

  it('Chromatic Staff: a flare, a pulsing magic circle and a gold Shiny02 at the orb (8), small ones on beads 1-7 (:8221-8251)', () => {
    const a = Math.abs(Math.sin(T * 0.0008));
    const pink = [0.8, 0.1, 0.4];
    const gold = [0.8, 0.8, 0.2];
    expect(held(5, 33)).toEqual([
      ['flare01', 8, undefined, 3.5, [0.9, 0.1, 0.4], 0],
      ['magicGround1', 8, undefined, 0.3, [r(0.1 + 0.8 * a), r(0.1 * a), r(0.1 + 0.4 * a)], 0],
      ['shiny02', 8, undefined, 1, gold, 0],
      ...[1, 2, 3, 4, 5, 6, 7].flatMap(bone => [
        ['flare01', bone, undefined, 0.6, pink, 0],
        ['magicGround1', bone, undefined, 0.12, pink, 0],
        ['shiny02', bone, undefined, 0.3, gold, 0],
      ]),
    ]);
  });

  it('Raven Stick: shines, pin lights and two growing magic circles at the head, shiny05 at 2 and 3 (:8252-8290)', () => {
    const circle = (rate: number, mod: number, add: number) => {
      const q = (Math.PI / 180) * ((Math.floor(T * rate) % mod) + add);
      return [Math.abs(Math.sin(q + Math.PI / 2)), Math.abs(Math.sin(q)) * 0.5];
    };
    const [t1, s1] = circle(0.02, 90, 0);
    const [t2, s2] = circle(0.05, 60, 30);
    expect(held(5, 34)).toEqual([
      ['shiny05', 1, undefined, 1.4, [0.4, 0.2, 1], 0],
      ['flare01', 1, undefined, 1.5, [0.7, 0.1, 0.9], 0],
      ['shiny03', 1, undefined, 1.5, [0, 0, 1], 0],
      ['pinLight', 1, undefined, 0.7, [0.4, 0.4, 1], -(Math.floor(T * 0.04) % 360)],
      ['pinLight', 1, undefined, 0.8, [0.4, 0.4, 1], -(Math.floor(T * 0.03) % 360)],
      ['magicGround1', 1, undefined, r(s1), [r(0.7 * t1), r(0.1 * t1), r(0.9 * t1)], 0],
      ['magicGround1', 1, undefined, r(s2), [r(0.1 + 0.7 * t2), r(0.1 * t2), r(0.1 + 0.3 * t2)], 0],
      ['shiny05', 2, undefined, 0.8, [0.9, 0, 0.1], 0],
      ['shiny05', 3, undefined, 0.6, [0.9, 0.4, 0.7], 0],
    ]);
  });
});

// RenderLinkObject's scepter cases (ZzzCharacter.cpp); every rand() reads RAND.
describe('the scepters\' held sprites', () => {
  const lum = (Math.floor(RAND * 30) + 70) * 0.005;

  it('Soleil Scepter: two Shiny02 and a flare at the head\'s jittered point, two smaller at the tail (:7104-7128)', () => {
    const j = Math.floor(RAND * 60) / 20 - 1.5;
    const head = [0, r(-100 + j), r(j)];
    const t = Math.floor(RAND * 40) / 20 - 1;
    const tail = [0, r(100 + t), r(t)];
    const sun = r(Math.floor(RAND * 10) / 20 + 1.4);
    const small = r(Math.floor(RAND * 8) / 20 + 0.4);
    const orange = [1, 0.3, 0];
    expect(held(2, 14)).toEqual([
      ['shiny02', 0, head, sun, orange, 0],
      ['shiny02', 0, head, r(sun - 0.3), orange, 20],
      ['flare01', 0, head, r(Math.floor(RAND * 10) / 20 + 1.3), orange, 0],
      ['shiny02', 0, tail, small, orange, 0],
      ['shiny02', 0, tail, r(small - 0.2), orange, 90],
    ]);
  });

  it('Shining Scepter: a pulsing gold Shiny02 and flares on bones 1-3 (:7319-7343)', () => {
    const l = Math.sin(T * 0.002) * 0.3 + 0.1;
    expect(held(2, 15)).toEqual([
      ['shiny02', 1, undefined, r(Math.floor(RAND * 10) / 30 + 1.7), [r(0.8 + l), r(0.5 + l), r(0.1 + l)], 0],
      ['flare01', 1, undefined, 3, [0.7, 0.5, 0.3], 0],
      ['flare01', 2, undefined, 1.5, [0.8, 0.6, 0.4], 0],
      ['flare01', 3, undefined, 1.2, [0.8, 0.6, 0.4], 0],
    ]);
  });

  it('Great Lord Scepter: a pulsing blue flare and two counter-turned Shiny02 at bone 1 (:7474-7488)', () => {
    const l = Math.sin(T * 0.002) * 0.3 + 0.7;
    const spin = Math.floor(RAND * 360);
    expect(held(2, 12)).toEqual([
      ['flare01', 1, undefined, 2, [0, r(l * 0.5), r(l)], 0],
      ['shiny02', 1, undefined, 1, [0.5, 0.5, 0.5], spin],
      ['shiny02', 1, undefined, 1, [0.5, 0.5, 0.5], 360 - spin],
    ]);
  });

  it('Battle Scepter: its own case, two pulsing blue flares by bone 1 and two swinging grey Shiny02 (:7576-7593)', () => {
    const scale = r(Math.sin(T * 0.001) + 1);
    const blue = [r(lum * 0.2), r(lum * 0.1), r(lum * 3)];
    const g = r(Math.sin(T * 0.001) * 0.5 + 0.5);
    const swing = Math.sin(T * 0.01) * 360;
    expect(held(2, 8)).toEqual([
      ['flare01', 1, [-15, 0, 0], scale, blue, 0],
      ['flare01', 1, [10, 0, 0], scale, blue, 0],
      ['shiny02', 1, [10, 0, 0], 0.6, [g, g, g], r(360 - swing)],
      ['shiny02', 1, [10, 0, 0], 0.6, [g, g, g], r(swing)],
    ]);
  });

  it('Master Scepter: a pulsing blue flare 10 cm off bones 2-5, a turned Shiny02 with bone 4\'s (:7594-7611)', () => {
    const l = Math.sin(T * 0.002) * 0.35 + 0.65;
    const blue = [r(l * 0.6), r(l * 0.8), r(l)];
    const flare = (bone: number) => ['flare01', bone, [-10, 0, 0], 1, blue, 0];
    expect(held(2, 9)).toEqual([flare(2), flare(3), flare(4), ['shiny02', 4, [-10, 0, 0], 0.6, [0.5, 0.5, 0.5], Math.floor(RAND * 360)], flare(5)]);
  });

  it('Great Scepter: a warm flare and Shiny02 at bone 2, a blue gem swinging with the pulse along bone 1 (:7612-7630)', () => {
    const l = Math.sin(T * 0.001) * 0.5 + 0.7;
    const warm = [r(l), r(l * 0.8), r(l * 0.6)];
    const at = [r(l * -10), 0, 0];
    const spin = Math.floor(RAND * 360);
    expect(held(2, 10)).toEqual([
      ['flare01', 2, undefined, 1.5, warm, 0],
      ['shiny02', 2, undefined, r(l * 0.5), warm, 0],
      ['flare01', 1, at, 0.7, [0.6, 0.8, 1], 0],
      ['shiny02', 1, at, 0.5, [0.6, 0.8, 1], spin],
      ['shiny02', 1, at, 0.4, [0.6, 0.8, 1], 360 - spin],
    ]);
  });

  it('Lord Scepter: an amber flare at bone 1, three along bone 2 with turned Shiny02 (:7631-7646)', () => {
    const amber = [1, 0.6, 0.3];
    expect(held(2, 11)).toEqual([
      ['flare01', 1, undefined, 1.3, amber, 0],
      ...[0, 1, 2].flatMap(i => [
        ['flare01', 2, [i * 15 - 10, 0, 0], 1.3, amber, 0],
        ['shiny02', 2, [i * 15 - 10, 0, 0], 0.4, amber, Math.floor(RAND * 360)],
      ]),
    ]);
  });

  it('Absolute Scepter: flares and pulsing Shiny02 at bones 3 and 4, each with a bolt on the frame\'s sheet (:7928-7969)', () => {
    const l = Math.abs(Math.sin(T * 0.0008)) * 0.8 + 0.2;
    const pulse = [r(l * 0.6), r(l * 0.5), r(l * 0.8)];
    const violet = [0.6, 0.5, 0.8];
    const spin = Math.floor(RAND * 380);
    // At T (1234 ms) no re-roll has run: the first sheet, no offset.
    const bolt = (bone: number, size: number) =>
      [0, 1, 2].map(sheet => [`lightningMega${sheet + 1}`, bone, [0, 0, 0], sheet === 0 ? r(size) : 0, [0.8, 0.8, 0.8], spin]);
    expect(held(2, 17)).toEqual([
      ['flare01', 3, undefined, r(Math.floor(RAND * 10) / 10 + 1), violet, 0],
      ['shiny02', 3, undefined, 0.5, pulse, 0],
      ...bolt(3, (Math.floor(RAND * 11) - 20) / 100 + 0.5),
      ['flare01', 4, undefined, r(Math.floor(RAND * 10) / 5 + 1.5), violet, 0],
      ['shiny02', 4, undefined, 1, pulse, 0],
      ...bolt(4, (Math.floor(RAND * 11) - 20) / 50 + 0.8),
    ]);
    // In the first 100 ms of a second it re-rolls: m_iAnimation 50 picks sheet (50 / 10) % 3 = 2.
    const random = vi.spyOn(Math, 'random').mockReturnValue(RAND);
    const sprites = itemHeldSprites(2, 17) ?? [];
    const scale = (i: number) => (typeof sprites[i].scale === 'number' ? sprites[i].scale : sprites[i].scale(2050));
    expect([2, 3, 4].map(scale).map(s => s > 0)).toEqual([false, false, true]);
    random.mockRestore();
  });

  it('Stryker Scepter: Shiny02 and light marks at rx01 and rx02, gold ones on 2 and 3, a pulsing Flare at 4 (:8310-8344)', () => {
    expect(held(2, 18)).toEqual([
      ['shiny02', 5, undefined, 0.5, [0.5, 0.8, 0.9], 0],
      ['lightmarks', 5, undefined, 1, [0.4, 0.7, 0.9], 0],
      ['shiny02', 6, undefined, 1.1, [0.5, 0.6, 0.9], 0],
      ['shiny02', 2, undefined, 0.5, [0.8, 0.5, 0.2], 0],
      ['shiny02', 3, undefined, 0.5, [0.8, 0.5, 0.2], 0],
      ['flare', 4, undefined, r(0.5 * Math.abs(Math.sin(T * 0.0015))), [1, 1, 1], 0],
    ]);
  });
});

// RenderLinkObject's shield cases (ZzzCharacter.cpp).
describe('the shields\' held sprites', () => {
  const lum = (Math.floor(RAND * 30) + 70) * 0.005;

  it('Grand Soul Shield: a blue Shiny02 and a flare of Luminosity + 1.5 off bone 1 (:7558-7565)', () => {
    const blue = [r(lum * 0.6), r(lum * 0.6), r(lum * 2)];
    expect(held(6, 15)).toEqual([
      ['shiny02', 1, [15, -15, 0], 1.5, blue, 0],
      ['flare01', 1, [15, -15, 0], r(lum + 1.5), blue, 0],
    ]);
  });

  it('Crimson Glory: gold flares on bones 4-10, pulsing red flares on 1-3 (:8116-8143)', () => {
    const g = r(Math.abs(Math.sin(T * 0.0005)));
    expect(held(6, 17)).toEqual([
      ...[4, 5, 6, 7, 8, 9, 10].map(bone => ['flare01', bone, undefined, 1.5, [0.8, 0.6, 0.2], 0]),
      ['flareRed', 1, undefined, 0.5, [g, g, g], 0],
      ['flareRed', 2, undefined, 0.3, [g, g, g], 0],
      ['flareRed', 3, undefined, 0.3, [g, g, g], 0],
    ]);
  });

  it('Salamander Shield: a red flare at bone 1 (:8144-8166)', () => {
    expect(held(6, 18)).toEqual([['flare01', 1, undefined, 2, [0.9, 0, 0.2], 0]]);
  });

  it('Guardian Shield: pulsing violet flares on bones 1-9 (:8167-8190)', () => {
    const l = Math.abs(Math.sin(T * 0.001)) + 0.1;
    expect(held(6, 20)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(bone => ['flare01', bone, undefined, 1.5, [r(0.8 * l), r(0.3 * l), r(0.8 * l)], 0]));
  });

  it('Cross Shield: pulsing blue flares on bones 4-7, teal on 8-13 (:8191-8220)', () => {
    const l = Math.abs(Math.sin(T * 0.001)) + 0.1;
    expect(held(6, 21)).toEqual([
      ...[4, 5, 6, 7].map(bone => ['flare01', bone, undefined, 1.2, [r(0.2 * l), r(0.2 * l), r(0.8 * l)], 0]),
      ...[8, 9, 10, 11, 12, 13].map(bone => ['flare01', bone, undefined, 1.4, [r(0.2 * l), r(0.6 * l), r(0.6 * l)], 0]),
    ]);
  });
});

// RenderLinkObject's Archangel, Daybreak, Beuroba and phoenix wing cases (ZzzCharacter.cpp).
describe('the Archangel set\'s and the rest\'s held sprites', () => {
  const lum = (Math.floor(RAND * 30) + 70) * 0.005;
  const red = [r(lum), r(lum * 0.3), r(lum * 0.1)];
  // rand_fps_check(3) fails at RAND: the grey Shiny02 is drawn at 0 this frame.
  const glint = (bone: number, at?: number[]) => [
    ['shiny02', bone, at, 0, [0.4, 0.4, 0.4], Math.floor(RAND * 360)],
    ['flare01', bone, at, 2, red, 0],
  ];

  it('Divine Sword of Archangel: a red flare and a one-in-three grey Shiny02 on bones 2-8 (:7489-7520)', () => {
    expect(held(0, 19)).toEqual([2, 3, 4, 5, 6, 7, 8].flatMap(bone => glint(bone)));
  });

  it('Divine Staff of Archangel: ten glints in a row 40 cm off bone 0 (:7060-7076)', () => {
    expect(held(5, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(i => glint(0, [i * 30 - 180, -40, 0])));
  });

  it('Divine Scepter of Archangel: one glint at bone 0 (:7647-7660)', () => {
    expect(held(2, 13)).toEqual(glint(0));
  });

  it('Daybreak: two Impack03 by bone 2, a still and a turning Shiny02, a flickering grey flare (:7224-7254)', () => {
    const grey = [0.6, 0.6, 0.6];
    const f = r(Math.sin(T * 0.4) * 0.25 + 0.6);
    expect(held(0, 24)).toEqual([
      ['impact03', 2, [0, 0, 3], 0.45, grey, 0],
      ['impact03', 2, [0, 0, -3], 0.45, grey, 0],
      ['shiny02', 2, undefined, 0.7, grey, 0],
      ['shiny02', 2, undefined, r(0.5 + Math.floor(RAND * 100) / 180), grey, r(T * 0.0006 * 360)],
      ['flare01', 2, undefined, 3, [f, f, f], 0],
    ]);
  });

  it('Beuroba: two pink shiny05 at bones 3 and 4, a green flare at 5 (:8291-8309)', () => {
    const pink = [0.9, 0.2, 0.7];
    expect(held(3, 11)).toEqual([
      ['shiny05', 3, undefined, 0.8, pink, 0],
      ['shiny05', 3, undefined, 0.3, pink, 0],
      ['shiny05', 4, undefined, 0.8, pink, 0],
      ['shiny05', 4, undefined, 0.3, pink, 0],
      ['flare01', 5, undefined, 1.5, [0.2, 0.9, 0.1], 0],
    ]);
  });

  it('the Phoenix Soul Star\'s wing: green light marks at a random turn on bones 3-10 and 13-20 (:8386-8401)', () => {
    const size = r(Math.floor(RAND * 30) / 300 + 0.3);
    const bones = [3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20];
    expect(held(0, 35, itemWingSprites)).toEqual(bones.map(bone => ['lightmarks', bone, undefined, size, [0.18, 0.45, 0.22], Math.floor(RAND * 360)]));
    expect(held(0, 35)).toBeNull();
  });
});

// RenderPartObjectBody's branches past weapons1's ranges (ZzzObject.cpp).
describe('the Archangel set, the late bows, shields and armour sets', () => {
  const metal = { mesh: 0, kind: 'unlit', texture: 'Effect/Shiny01.OZJ', clamp: true, map: 'metal' };
  const sweep = (v: number) => ({ mesh: 0, kind: 'add', texture: 'Effect/Chrome01.OZJ', v: r(v) });
  const BAB2 = { texture: 'Effect/bab2.OZJ', map: 'chrome' };

  it('Divine Sword of Archangel: mesh 0 RENDER_METAL (Shiny01) and a Chrome01 sweep up v, mesh 1 lit (:6979-6984)', () => {
    expect(look(0, 19)).toEqual({ drawn: [1], passes: [metal, sweep(T * 0.0001)] });
  });

  it('Divine Staff and Crossbow of Archangel: the same metal, the sweep back down v (:6985-6996)', () => {
    const staff = { drawn: [1], passes: [metal, sweep(-T * 0.0001)] };
    expect(look(5, 10)).toEqual(staff);
    expect(look(4, 18)).toEqual(staff);
  });

  it('Divine Scepter of Archangel: mesh 0 lit and the sweep down v, nothing else (:6997-7001)', () => {
    expect(look(2, 13)).toEqual({ drawn: [0], passes: [sweep(-T * 0.0001)] });
  });

  it('Great Reign Crossbow: a violet Chrome01 sweep back along u and bab2 over mesh 0, the body lit (:7002-7012)', () => {
    expect(look(4, 19)).toEqual({
      drawn: undefined,
      passes: [
        { mesh: 0, kind: 'add', texture: 'Effect/Chrome01.OZJ', light: [r(0.8 * BODY.x), 0, r(0.8 * BODY.z)], u: r(-T * 0.0002) },
        { mesh: 0, kind: 'add', ...BAB2 },
      ],
    });
  });

  it('Arrow Viper Bow: meshes 3 and 4 their own blend meshes at a pulse, the rest lit (:7860-7873)', () => {
    const gain = r(Math.sin(T * 0.002) * 0.3 + 0.5);
    expect(look(4, 20)).toEqual({
      drawn: [0, 1, 2, 5, 6],
      passes: [
        { mesh: 3, kind: 'bright', gain },
        { mesh: 4, kind: 'bright', gain },
      ],
    });
  });

  it('Crimson Glory, Salamander, Frost Barrier, Guardian and Cross shields (:7161-7191)', () => {
    expect(look(6, 17)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add' }, { mesh: 2, kind: 'add', ...CHROME }] });
    expect(look(6, 18)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'bright' }] });
    expect(look(6, 19)).toEqual({
      drawn: [0],
      passes: [
        { mesh: 1, kind: 'bright' },
        { mesh: 2, kind: 'bright', gain: r(Math.abs(Math.sin(T * 0.001))) },
      ],
    });
    expect(look(6, 20)).toEqual({ drawn: undefined, passes: [{ mesh: 1, kind: 'add' }] });
    expect(look(6, 21)).toEqual({ drawn: [0], passes: [{ mesh: 1, kind: 'bright', ...CHROME }, { mesh: 2, kind: 'bright' }] });
  });

  it('Storm Crow and Thunder Hawk: bab2 over the whole body, the hawk\'s in (0.85, 0.85, 1.2) of its light (:6900-6913)', () => {
    for (const group of [8, 9, 10, 11]) {
      expect(look(group, 15)).toEqual({ drawn: undefined, passes: [{ mesh: -1, kind: 'add', ...BAB2 }] });
      expect(look(group, 20)).toEqual({
        drawn: undefined,
        passes: [{ mesh: -1, kind: 'add', ...BAB2, light: [r(BODY.x * 0.85), r(BODY.y * 0.85), r(BODY.z * 1.2)] }],
      });
    }
    expect(look(7, 15)).toBeNull(); // the helms are not in the branch
  });
});
