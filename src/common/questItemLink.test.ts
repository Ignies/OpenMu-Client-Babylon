import { describe, expect, it } from 'vitest';
import { Matrix } from '../libs/babylon/exports';
import { applyWeaponAttachments, BACK_BONE, questItemLink } from './weaponAttachment';
import type { PlayerObject } from './playerObject';
import type { Item } from '../ecs/world';

/** The link a weapon gets when it is stowed from the second weapon slot. */
function stowedOffHandLink(item: Item): Matrix {
  const links: { bone: number; link?: Matrix }[] = [];
  const part = { setBoneLink: (bone: number, link?: Matrix) => links.push({ bone, link }) };
  const player = { Weapon1: part, Weapon2: part } as unknown as PlayerObject;
  applyWeaponAttachments(player, { leftHand: null, rightHand: item }, true);
  const back = links.find(l => l.bone === BACK_BONE);
  if (!back?.link) throw new Error('not stowed');
  return back.link;
}

describe('the Blood Castle quest weapon', () => {
  it('sits on the back like the same weapon stowed from the second slot', () => {
    for (const [group, num] of [
      [5, 10], // Divine Staff
      [0, 19], // Divine Sword
      [4, 18], // Divine Crossbow
    ]) {
      const item = { group, num } as Item;
      expect(questItemLink(item).equalsWithEpsilon(stowedOffHandLink(item), 1e-6)).toBe(true);
    }
  });

  it('is not left upright on the bone', () => {
    expect(questItemLink({ group: 0, num: 19 }).isIdentity()).toBe(false);
  });
});
