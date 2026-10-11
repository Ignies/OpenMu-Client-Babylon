import { describe, expect, it } from 'vitest';
import { cloaksFor, type CloakWearer } from '@/controllers/actors/cloaks';
import { PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, type ClothSpec } from '@/controllers/cloth';
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
