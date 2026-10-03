import { describe, expect, it } from 'vitest';
import type { Entity, Item } from '../ecs/world';
import { CharacterClassNumber, ENUM_WORLD } from './types';
import { heldWeapons, shownGear } from './chaosCastleUnit';
import { ItemsDatabase } from './itemsDatabase';

const CASTLE = ENUM_WORLD.WD_18CHAOS_CASTLE;
const LORENCIA = ENUM_WORLD.WD_0LORENCIA;

const BLADE: Item = { group: 0, num: 5, lvl: 13, isExcellent: true };
const SHIELD: Item = { group: 6, num: 4, lvl: 9 };
const ARMOUR: Item = { group: 8, num: 1, lvl: 13, isExcellent: true };

function player(
  charClass: CharacterClassNumber,
  extra: Partial<Entity> = {}
): Entity {
  return {
    charAppearance: {
      helm: null,
      armor: ARMOUR,
      pants: null,
      gloves: null,
      boots: null,
      leftHand: BLADE,
      rightHand: SHIELD,
      wings: null,
      pet: null,
      charClass,
      changed: false,
    },
    ...extra,
  };
}

const names = (e: Entity, map: number) => {
  const hands = heldWeapons(e, map);
  return [hands?.leftHand, hands?.rightHand].map(
    i =>
      i && `${ItemsDatabase.getItem(i.group, i.num)?.ItemName} +${i.lvl ?? 0}`
  );
};

describe('weapons inside Chaos Castle', () => {
  it("are the castle's for every class", () => {
    const sword = 'Sword of Destruction +0';
    expect(names(player(CharacterClassNumber.DarkKnight), CASTLE)).toEqual([
      sword,
      sword,
    ]);
    expect(names(player(CharacterClassNumber.MagicGladiator), CASTLE)).toEqual([
      sword,
      sword,
    ]);
    expect(names(player(CharacterClassNumber.DarkLord), CASTLE)).toEqual([
      sword,
      sword,
    ]);
    expect(names(player(CharacterClassNumber.RageFighter), CASTLE)).toEqual([
      sword,
      sword,
    ]);
    expect(names(player(CharacterClassNumber.FairyElf), CASTLE)).toEqual([
      'Great Reign Crossbow +0',
      null,
    ]);
    expect(names(player(CharacterClassNumber.DarkWizard), CASTLE)).toEqual([
      'Legendary Staff +0',
      null,
    ]);
    expect(names(player(CharacterClassNumber.Summoner), CASTLE)).toEqual([
      'Legendary Staff +0',
      null,
    ]);
  });

  it("are a player's own everywhere else", () => {
    expect(
      heldWeapons(player(CharacterClassNumber.DarkKnight), LORENCIA)
    ).toMatchObject({
      leftHand: BLADE,
      rightHand: SHIELD,
    });
  });

  it('stay their own for a transformed player and an NPC', () => {
    for (const e of [
      player(CharacterClassNumber.DarkKnight, { skin: 7 }),
      player(CharacterClassNumber.DarkKnight, { npcType: 232 }),
    ]) {
      expect(heldWeapons(e, CASTLE)?.leftHand).toBe(BLADE);
    }
  });

  it('leave no armour for the glow to come off', () => {
    const gear = shownGear(player(CharacterClassNumber.DarkKnight), CASTLE);
    expect(gear?.armor).toBeNull();
    expect(gear?.leftHand?.isExcellent).toBeFalsy();
    expect(
      shownGear(player(CharacterClassNumber.DarkKnight), LORENCIA)?.armor
    ).toBe(ARMOUR);
  });
});
