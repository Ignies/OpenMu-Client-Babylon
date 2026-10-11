import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { cloaksFor, type CloakSet, type CloakWearer } from '@/controllers/actors/cloaks';
import {
  PCT_CURVED,
  PCT_ELASTIC_RAGE_L,
  PCT_ELASTIC_RAGE_R,
  PCT_HEAVY,
  PCT_MASK_ALPHA,
  PCT_MASK_BLEND,
  PCT_MASK_LIGHT,
  PCT_RUBBER2,
  PCT_SHORT_SHOULDER,
  PCT_STICKED,
  type ClothSpec,
} from '@/controllers/cloth';
import { CharacterClassNumber as C } from '@/core/types';
import type { Item } from '@/ecs/world';
import './index';

const CAPE_OF_LORD: Item = { group: 13, num: 30 };
const MANTLE_OF_MONARCH: Item = { group: 12, num: 40 };
const WINGS_OF_SATAN: Item = { group: 12, num: 2 };
const LEATHER_ARMOR: Item = { group: 8, num: 5 };

/** A wearer's set as the rule sees it: what is built in each slot, the count, the frame's draws. */
class FakeSet implements CloakSet {
  built = false;
  count = 0;
  readonly specs: (ClothSpec | null)[] = [];
  readonly drawn = new Set<number>();
  build(slot: number, spec: ClothSpec) {
    this.specs[slot] = spec;
    this.built = true;
  }
  destroy(slot: number) {
    this.specs[slot] = null;
  }
  has(slot: number) {
    return !!this.specs[slot];
  }
  draw(slot: number) {
    if (this.specs[slot]) this.drawn.add(slot);
  }
  drop() {
    this.specs.length = 0;
    this.built = false;
    this.count = 0;
  }
}

/** `frames` frames of the rule on one set (two: the skirt settles); `out` is what the last one draws, by slot. */
function run(w: CloakWearer, frames: number, set = new FakeSet()) {
  let light: readonly number[] = [];
  for (let f = 0; f < frames; f++) {
    set.drawn.clear();
    light = cloaksFor(w, set);
  }
  const out = Array.from({ length: set.specs.length }, (_, i) => (set.drawn.has(i) ? (set.specs[i] ?? null) : null));
  return { out, light, set };
}

const wearer = (over: Partial<CloakWearer>): CloakWearer => ({
  charClass: C.DarkLord, wing: null, armor: null, skin: null, chaosCastle: false, netId: null, hero: false, guild: null, ...over,
});

const wear = (over: Partial<CloakWearer>, frames = 2) => run(wearer(over), frames);

describe('the Cape of Lord (ZzzCharacter.cpp:9733-9741, drawn by :9930)', () => {
  it('hangs the Dark Lord\'s cloth 2 from the neck: DarklordRobe.tga, 10 x 10 over 180 x 180, keyed, four back spheres', () => {
    const { out, light } = wear({ wing: CAPE_OF_LORD });
    expect(out[2]).toEqual({
      bone: 19,
      at: [0, 8, 10],
      grid: [10, 10],
      size: [180, 180],
      front: 'Player/DarklordRobe.OZT',
      back: 'Player/DarklordRobe.OZT',
      flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_MASK_ALPHA,
      spheres: [
        [-10, -10, -10, 25, 17],
        [10, -10, -10, 25, 17],
        [-10, -10, 20, 27, 17],
        [10, -10, 20, 27, 17],
      ],
    });
    expect(light).toEqual([1, 1, 1]);
  });

  it('is the same cloth on a Lord Emperor, and none without the cape or with another wing', () => {
    expect(wear({ charClass: C.LordEmperor, wing: CAPE_OF_LORD }).out[2]).toBe(wear({ wing: CAPE_OF_LORD }).out[2]);
    expect(wear({}).out[2] ?? null).toBeNull();
    expect(wear({ wing: WINGS_OF_SATAN }).out[2] ?? null).toBeNull();
  });

  it('hangs on no other class and never inside Chaos Castle (bCloak, :9162-9186)', () => {
    expect(wear({ charClass: C.DarkKnight, wing: CAPE_OF_LORD }).out.filter(Boolean)).toEqual([]);
    expect(wear({ wing: CAPE_OF_LORD, chaosCastle: true }).out.filter(Boolean)).toEqual([]);
  });
});

describe('the Mantle of Monarch (:9717-9724, :9763-9772)', () => {
  it('turns the cape into dl_redwings02.tga, heavy, and adds the two dl_redwings03.tga straps as cloths 4 and 5', () => {
    const { out } = wear({ wing: MANTLE_OF_MONARCH });
    expect(out[2]).toMatchObject({ front: 'Item/dl_redwings02.OZT', size: [180, 180], flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA });
    expect([out[4], out[5]].map(s => [s?.at, s?.grid, s?.size, s?.front, s?.flags])).toEqual([
      [[30, 15, 10], [2, 5], [12, 200], 'Item/dl_redwings03.OZT', PCT_MASK_ALPHA],
      [[-30, 20, 10], [2, 5], [12, 200], 'Item/dl_redwings03.OZT', PCT_MASK_ALPHA],
    ]);
    expect(out[4]?.spheres).toEqual([
      [0, -15, -20, 30, 2],
      [0, 0, 0, 35, 17],
    ]);
  });
});

const CAPE_OF_FIGHTER: Item = { group: 12, num: 49 };
const CAPE_OF_OVERRULE: Item = { group: 12, num: 50 };
/** The Rage Fighter's cape spheres, bone 17 (ZzzCharacter.cpp:9802-9805). */
const FIGHTER_BACK = [
  [-10, -10, -10, 35, 17],
  [10, -10, -10, 35, 17],
  [-10, -10, 20, 37, 17],
  [10, -10, 20, 37, 17],
];

describe('the Cape of Fighter (ZzzCharacter.cpp:9799-9806, drawn by :9943-9951)', () => {
  it('hangs the Rage Fighter\'s cloth 0 from the neck: NCcape.tga, 10 x 10 over 180 x 170, heavy and keyed', () => {
    const { out } = wear({ charClass: C.RageFighter, wing: CAPE_OF_FIGHTER });
    expect(out[0]).toEqual({
      bone: 19,
      at: [0, 15, 5],
      grid: [10, 10],
      size: [180, 170],
      front: 'Item/NCcape.OZT',
      back: 'Item/NCcape.OZT',
      flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
      spheres: FIGHTER_BACK,
    });
    expect(out.filter(Boolean)).toHaveLength(1);
  });

  it('is the same on a Fist Master, and none without the cape', () => {
    expect(wear({ charClass: C.FistMaster, wing: CAPE_OF_FIGHTER }).out[0]).toBe(wear({ charClass: C.RageFighter, wing: CAPE_OF_FIGHTER }).out[0]);
    expect(wear({ charClass: C.RageFighter }).out.filter(Boolean)).toEqual([]);
    expect(wear({ charClass: C.RageFighter, wing: WINGS_OF_SATAN }).out.filter(Boolean)).toEqual([]);
  });
});

describe('the Cape of Overrule (:9783-9790, :9808-9817)', () => {
  it('turns the cape into monke_manto.tga and adds two monk_manto01.tga straps blown out to each side', () => {
    const { out } = wear({ charClass: C.RageFighter, wing: CAPE_OF_OVERRULE });
    expect(out[0]).toEqual({ ...wear({ charClass: C.RageFighter, wing: CAPE_OF_FIGHTER }).out[0], front: 'Item/monke_manto.OZT', back: 'Item/monke_manto.OZT' });
    expect([out[1], out[2]].map(s => [s?.at, s?.grid, s?.size, s?.front, s?.flags, s?.spheres])).toEqual([
      [[25, 15, 2], [2, 5], [12, 180], 'Item/monk_manto01.OZT', PCT_ELASTIC_RAGE_L | PCT_MASK_ALPHA, [[0, -15, -20, 35, 2], [0, 0, 0, 45, 17]]],
      [[-25, 15, 2], [2, 5], [12, 180], 'Item/monk_manto01.OZT', PCT_ELASTIC_RAGE_R | PCT_MASK_ALPHA, [[0, -15, -20, 35, 2], [0, 0, 0, 50, 17]]],
    ]);
  });
});

const WING_OF_RUIN: Item = { group: 12, num: 39 };

describe('the Magic Gladiator\'s robe (ZzzCharacter.cpp:9837-9846)', () => {
  it('hangs cloth 0 from the neck: Robe01.jpg in front, Robe02.jpg behind, 75 x 120, heavy and opaque', () => {
    const { out } = wear({ charClass: C.MagicGladiator });
    expect(out[0]).toEqual({
      bone: 19,
      at: [0, 10, 0],
      grid: [10, 10],
      size: [75, 120],
      front: 'Player/Robe01.OZJ',
      back: 'Player/Robe02.OZJ',
      flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY,
    });
    expect(out.filter(Boolean)).toHaveLength(1);
    // Any wing but the Wing of Ruin keeps it.
    expect(wear({ charClass: C.MagicGladiator, wing: WINGS_OF_SATAN }).out[0]).toBe(out[0]);
  });

  it('turns into msword03.tga under the Wing of Ruin, 120 x 120 and keyed', () => {
    expect(wear({ charClass: C.MagicGladiator, wing: WING_OF_RUIN }).out[0]).toEqual({
      bone: 19,
      at: [0, 15, 0],
      grid: [10, 10],
      size: [120, 120],
      front: 'Item/msword03.OZT',
      back: 'Item/msword03.OZT',
      flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
    });
  });

  it('is the class\'s alone: the Duel Master has none (`c->Class == CLASS_DARK`, :9164)', () => {
    expect(wear({ charClass: C.DuelMaster }).out.filter(Boolean)).toEqual([]);
  });

  it('goes under a ring\'s body but the skeletons\' (CheckDarkCloak), and every cloth goes in the Illusion Temple\'s (:9953-9961)', () => {
    const robe = (skin: string | null) => wear({ charClass: C.MagicGladiator, skin }).out.filter(Boolean).length;
    expect(['Skeleton01.glb', 'Skeleton02.glb', 'Skeleton03.glb'].map(robe)).toEqual([1, 1, 1]);
    expect(['youngza.glb', 'jack.glb', 'santa.glb', 'panda.glb', 'trans_skeleton.glb'].map(robe)).toEqual([0, 0, 0, 0, 0]);
    expect(['illusionist.glb', 'unitedsoldier.glb'].map(robe)).toEqual([0, 0]);
    expect(wear({ charClass: C.RageFighter, wing: CAPE_OF_FIGHTER, skin: 'unitedsoldier.glb' }).out.filter(Boolean)).toEqual([]);
  });
});

/** The hair's spheres, the upper back (ZzzCharacter.cpp:9709-9710). */
const HAIR_BACK = [
  [-10, 20, 20, 27, 17],
  [10, 20, 20, 27, 17],
];

describe('the Dark Lord\'s hair (ZzzCharacter.cpp:9707-9715)', () => {
  it('hangs cloths 0 and 1 from the head: iui06.jpg, a pulsing light and an added strand, each in its own gusts', () => {
    const { out } = wear({});
    expect(out[0]).toEqual({
      bone: 20,
      at: [0, 0, 20],
      grid: [6, 5],
      size: [30, 70],
      front: 'Monster/iui06.OZJ',
      back: 'Monster/iui06.OZJ',
      flags: PCT_CURVED | PCT_RUBBER2 | PCT_MASK_LIGHT | PCT_SHORT_SHOULDER,
      wind: [10, 50],
      spheres: HAIR_BACK,
    });
    expect(out[1]).toEqual({
      bone: 20,
      at: [0, 5, 18],
      grid: [5, 5],
      size: [30, 70],
      front: 'Monster/iui06.OZJ',
      back: 'Monster/iui06.OZJ',
      flags: PCT_CURVED | PCT_RUBBER2 | PCT_MASK_BLEND | PCT_SHORT_SHOULDER,
      wind: [8, 40],
      spheres: HAIR_BACK,
    });
  });

  it('is on every Dark Lord whatever he wears, and goes under any ring\'s body (CheckDarkLordHair, :9934-9937)', () => {
    expect(wear({ charClass: C.LordEmperor, wing: CAPE_OF_LORD }).out.slice(0, 2)).toEqual(wear({}).out.slice(0, 2));
    expect(['Skeleton01.glb', 'youngza.glb', 'panda.glb'].map(skin => wear({ skin }).out.slice(0, 2).filter(Boolean))).toEqual([[], [], []]);
    // The cape stays on under a ring's body.
    expect(wear({ wing: CAPE_OF_LORD, skin: 'jack.glb' }).out[2]).toBe(wear({ wing: CAPE_OF_LORD }).out[2]);
  });
});


describe('the Dark Lord\'s skirt (ZzzCharacter.cpp:9752-9761, :9852-9920)', () => {
  // What a set settles to: the frame after it is built, the skirt is made again at (0, 8, -5) with
  // PCT_STICKED and PCT_CURVED both, which the shape switch reads as neither (:9866-9887).
  const skirt = (front: string): ClothSpec => ({
    bone: 18,
    at: [0, 8, -5],
    grid: [5, 5],
    size: [50, 90],
    front,
    back: front,
    flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_CURVED | PCT_SHORT_SHOULDER,
    spheres: [[0, -15, -20, 30, 2]],
  });

  it('hangs cloth 3 from the waist over the class\'s own body: kaa.tga on the Dark Lord, dark3chima3.tga on the Lord Emperor', () => {
    expect(wear({}).out[3]).toEqual(skirt('Player/kaa.OZT'));
    expect(wear({ charClass: C.LordEmperor }).out[3]).toEqual(skirt('Player/dark3chima3.OZT'));
  });

  it('goes under any armour and any ring\'s body (:9854-9865, :9938-9941)', () => {
    expect(wear({ armor: LEATHER_ARMOR }).out[3] ?? null).toBeNull();
    expect(wear({ skin: 'Skeleton02.glb' }).out[3] ?? null).toBeNull();
  });

  it('under the Mantle of Monarch keeps the one the set was built with, sticked at (0, 10, -5); a Lord Emperor loses it (:9888-9896)', () => {
    expect(wear({ wing: MANTLE_OF_MONARCH }).out[3]).toEqual({ ...skirt('Player/kaa.OZT'), at: [0, 10, -5], flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_SHORT_SHOULDER });
    expect(wear({ charClass: C.LordEmperor, wing: MANTLE_OF_MONARCH }).out[3] ?? null).toBeNull();
  });
});

describe('the set as RenderCharacter builds it and walks it (ZzzCharacter.cpp:9689-9985)', () => {
  it('builds the Dark Lord\'s cape whatever the wing and walks past it undrawn without one', () => {
    const { set } = wear({}, 1);
    expect([set.count, set.specs[2]?.front, set.drawn.has(2)]).toEqual([3, 'Player/DarklordRobe.OZT', false]);
  });

  it('builds the skirt with the set, uncounted, and makes it again counted the next frame (:9752-9761, :9866-9876)', () => {
    const first = wear({}, 1);
    expect([first.set.count, first.set.specs[3]?.at, first.out[3] ?? null]).toEqual([3, [0, 10, -5], null]);
    const second = run(wearer({}), 1, first.set);
    expect([second.set.count, second.out[3]?.at]).toEqual([4, [0, 8, -5]]);
    // Armour on tears it off and uncounts it; off again, it is made again.
    run(wearer({ armor: LEATHER_ARMOR }), 1, second.set);
    expect([second.set.count, second.set.has(3)]).toEqual([3, false]);
    expect(run(wearer({}), 1, second.set).out[3]?.at).toEqual([0, 8, -5]);
  });

  it('under the Mantle makes a skirt only once the armour comes off, then at (0, 8, -5) (:9897-9908)', () => {
    const { set } = wear({ wing: MANTLE_OF_MONARCH, armor: LEATHER_ARMOR });
    expect([set.count, set.has(3)]).toEqual([6, false]);
    expect(run(wearer({ wing: MANTLE_OF_MONARCH }), 1, set).out[3]?.at).toEqual([0, 8, -5]);
  });

  it('keeps a set out of a cloak as it was, undrawn: the Magic Gladiator walking into Chaos Castle', () => {
    const { set } = wear({ charClass: C.MagicGladiator });
    const after = run(wearer({ charClass: C.MagicGladiator, chaosCastle: true }), 1, set);
    expect([after.set.built, after.set.specs[0]?.front, after.out.filter(Boolean)]).toEqual([true, 'Player/Robe01.OZJ', []]);
  });
});
