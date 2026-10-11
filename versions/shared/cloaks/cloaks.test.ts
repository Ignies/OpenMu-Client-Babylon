import { describe, expect, it } from 'vitest';
import { cloaksFor, type CloakWearer } from '@/controllers/actors/cloaks';
import { PCT_CURVED, PCT_ELASTIC_RAGE_L, PCT_ELASTIC_RAGE_R, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, type ClothSpec } from '@/controllers/cloth';
import { CharacterClassNumber as C } from '@/core/types';
import type { Item } from '@/ecs/world';
import './index';

const CAPE_OF_LORD: Item = { group: 13, num: 30 };
const MANTLE_OF_MONARCH: Item = { group: 12, num: 40 };
const WINGS_OF_SATAN: Item = { group: 12, num: 2 };

function wear(over: Partial<CloakWearer>) {
  const out: (ClothSpec | null)[] = [];
  const light = cloaksFor({ charClass: C.DarkLord, wing: null, chaosCastle: false, ...over }, out);
  return { out, light };
}

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
