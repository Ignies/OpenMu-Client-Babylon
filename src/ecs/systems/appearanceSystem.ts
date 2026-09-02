import { ItemsDatabase } from '../../common/itemsDatabase';
import { itemVisualTier } from '../../common/itemVisualTier';
import type { ModelObject } from '../../common/modelObject';
import type { PlayerObject } from '../../common/playerObject';
import { applyWeaponAttachments } from '../../common/weaponAttachment';
import { isBook } from '../../common/weaponClass';
import type { ISystemFactory, Item } from '../world';

function loadPart(
  part: Item | null,
  playerObject: PlayerObject,
  socket: ModelObject
) {
  if (!part) return;
  const item = ItemsDatabase.getItem(part.group, part.num);

  if (!item) return;

  playerObject.loadPartAsync(
    item.szModelFolder,
    socket,
    item.szModelName,
    part.lvl,
    part.isExcellent,
    itemVisualTier(part)
  );

  return true;
}

export const AppearanceSystem: ISystemFactory = world => {
  const query = world.with('charAppearance', 'modelObject', 'visibility');

  return {
    update: () => {
      for (const {
        charAppearance,
        modelObject,
        visibility,
        attributeSystem,
      } of query) {
        if (visibility.state === 'hidden') continue;
        if (!charAppearance.changed) continue;
        if (!modelObject.Ready) continue;

        const playerObject = modelObject as PlayerObject;

        loadPart(charAppearance.helm, playerObject, playerObject.HelmMask) ||
          playerObject.setDefaultMask();
        loadPart(charAppearance.armor, playerObject, playerObject.Armor) ||
          playerObject.setDefaultArmor();
        loadPart(charAppearance.pants, playerObject, playerObject.Pants) ||
          playerObject.setDefaultPants();
        loadPart(charAppearance.gloves, playerObject, playerObject.Gloves) ||
          playerObject.setDefaultGloves();
        loadPart(charAppearance.boots, playerObject, playerObject.Boots) ||
          playerObject.setDefaultBoots();

        // c->Wing and the body-linked half of c->Helper. Both need their own
        // loader: the wing decides its bone (back vs cape) and blend mesh
        // before load, and the pet models live under Player/ rather than at
        // the Item/ path items.json carries for the horn items.
        void playerObject.setWingsAsync(charAppearance.wings);
        void playerObject.setBodyPetAsync(charAppearance.pet);

        // Summoner books are never drawn on the character (`RenderLinkObject`
        // returns before them, ZzzCharacter.cpp:6453-6456).
        const mainHand = isBook(charAppearance.leftHand)
          ? null
          : charAppearance.leftHand;
        const offHand = isBook(charAppearance.rightHand)
          ? null
          : charAppearance.rightHand;
        loadPart(mainHand, playerObject, playerObject.Weapon1) ||
          playerObject.Weapon1.Unload();
        loadPart(offHand, playerObject, playerObject.Weapon2) ||
          playerObject.Weapon2.Unload();

        if (attributeSystem) {
          // Kept for consumers of the flag; reset properly on unequip and
          // driven by the main-hand slot only (slot 0 = "leftHand" bytes).
          const main = charAppearance.leftHand;
          attributeSystem.setValue(
            'isSpearEquipped',
            main && main.group === 3 ? 1 : 0
          );
        }

        applyWeaponAttachments(
          playerObject,
          charAppearance,
          attributeSystem?.isAboveZero('weaponsOnBack') ?? false
        );

        charAppearance.changed = false;
        // Everything built off this character's items is re-examined from
        // here, the same way the item-effect stamps above are re-applied.
        charAppearance.applied = (charAppearance.applied ?? 0) + 1;
      }
    },
  };
};
