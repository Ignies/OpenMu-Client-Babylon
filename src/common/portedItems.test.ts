import { describe, expect, it } from 'vitest';
import { itemDef } from './itemStats';
import { emptyAppearance, deserializeAppearance } from './deserializeAppearance';
import { CAPE_BONE, WING_BONE, wingBone, wingSpec } from './wings';
import { CharacterClassNumber } from './types';

function defOf(group: number, num: number) {
  const def = itemDef(group, num);
  if (!def) throw new Error(`no item ${group}/${num}`);
  return def;
}

/** The items ported from MuMain's item data that the Item.txt never had. */
const PORTED: [group: number, num: number, model: string][] = [
  [5, 36, 'Item/Archangelus.glb'],
  [7, 59, 'Player/HelmMale60.glb'],
  [8, 60, 'Player/ArmorMale61.glb'],
  [9, 61, 'Player/PantMale62.glb'],
  [11, 73, 'Player/BootMale74.glb'],
  [12, 49, 'Item/Wing50.glb'],
  [12, 50, 'Item/Wing51.glb'],
];

describe('items ported from MuMain', () => {
  it('are known, with their own models', () => {
    for (const [group, num, model] of PORTED) {
      const def = defOf(group, num);
      expect(`${def.modelFolder}${def.modelName}`).toBe(model);
    }
  });

  it('dress the Rage Fighter', () => {
    const RAGE_FIGHTER = 6;
    for (const group of [7, 8, 9, 11]) {
      for (const num of [59, 60, 61, 73]) {
        expect(defOf(group, num).classes[RAGE_FIGHTER]).toBe(1);
      }
    }
  });

  it('wear the capes on the bones the original hangs them from', () => {
    const fighter = wingSpec({ group: 12, num: 49 });
    const overrule = wingSpec({ group: 12, num: 50 });
    expect(fighter).not.toBeNull();
    expect(wingBone(fighter)).toBe(WING_BONE);
    expect(wingBone(overrule)).toBe(CAPE_BONE);
  });

  it('read the capes out of another player\'s appearance', () => {
    const cape = (level: number) => {
      const app = emptyAppearance(CharacterClassNumber.RageFighter);
      app.setUint8(5, (app.getUint8(5) & ~0x0c) | level);
      app.setUint8(9, (app.getUint8(9) & ~0x07) | 7);
      return deserializeAppearance(app).wings;
    };
    expect(cape(0x08)).toEqual({ group: 12, num: 49, lvl: 0 });
    expect(cape(0x0c)).toEqual({ group: 12, num: 50, lvl: 0 });
  });
});
