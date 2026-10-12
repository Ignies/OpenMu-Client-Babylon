import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { itemBodyPasses, itemHeldSprites } from '@/controllers/item_fx/itemLooks';
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
function held(group: number, num: number) {
  const random = vi.spyOn(Math, 'random').mockReturnValue(RAND);
  const v = new Vector3();
  const rows = itemHeldSprites(group, num)?.map(s => {
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

  it('Knight Blade (and the Battle Scepter): a violet flare and a grey one on bones 1 and 2 (:7661-7673)', () => {
    const l = Math.sin(T * 0.002) * 0.35 + 0.65;
    const grey = r(Math.abs(Math.sin(T * 0.002) * 0.5 + 0.4)); // a negative scale draws the sprite mirrored
    const pair = (bone: number) => [
      ['flare01', bone, undefined, r(l * 0.9), [r(l * 0.43), r(l * 0.14), r(l * 0.6)], 0],
      ['flare01', bone, undefined, grey, [0.3, 0.3, 0.3], 0],
    ];
    expect(held(0, 20)).toEqual([...pair(1), ...pair(2)]);
    expect(held(2, 8)).toEqual(pair(1)); // Mace09 has no bone 2
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

});
