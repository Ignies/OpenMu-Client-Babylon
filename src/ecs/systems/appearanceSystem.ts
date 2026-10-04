import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';
import { itemVisualTier } from '../../controllers/item_fx/itemVisualTier';
import { heldWeapons, wearsChaosCastleSkin } from '../../controllers/actors';
import type { ModelObject } from '../../controllers/render/modelObject';
import { isPlayerBody, type PlayerObject } from '../../controllers/actors/playerObject';
import { applyWeaponAttachments } from '../../controllers/actors/weaponAttachment';
import { isBook, swordformGlovesModel } from '../../controllers/actors/weaponClass';
import type { ISystemFactory, Item } from '../world';
import { settle } from '../../controllers/assets';

function loadPart(
  part: Item | null,
  playerObject: PlayerObject,
  socket: ModelObject,
  /** Weapon slot, when this socket is one: picks the worn glove model. */
  slot?: 0 | 1
) {
  if (!part) return;
  const item = ItemsDatabase.getItem(part.group, part.num);

  if (!item) return;

  // A Rage Fighter glove weapon is worn as a left/right pair of its own
  // (`RenderSwordformGloves`, MonkSystem.cpp:248); the model items.json names
  // is the one the inventory draws.
  const worn =
    (slot !== undefined && swordformGlovesModel(part, slot)) || item.szModelName;

  // A model that fails to load leaves the slot as it was.
  void settle(
    playerObject.loadPartAsync(
      item.szModelFolder,
      socket,
      worn,
      part.lvl,
      part.isExcellent,
      itemVisualTier(part)
    ),
    item.szModelFolder + worn
  );

  return true;
}

/**
 * Inside Chaos Castle every player is drawn as the one `Player/Angel` body
 * instead of their equipment (`RenderCharacter`, ZzzCharacter.cpp:9536-9568):
 * the castle's participant skin, the armour its monsters wear too. Wings and
 * the pet go with it (`ClearChaosCastleHelper`, CSChaosCastle.cpp:113-128),
 * and the hands hold the castle's weapons (`heldWeapons`).
 */
const CHAOS_CASTLE_BODY = 'Angel.glb';

/** Bodies wearing it, so the class head goes back on once out of the castle. */
const inCastleSkin = new WeakSet<PlayerObject>();

function wearChaosCastleSkin(playerObject: PlayerObject) {
  inCastleSkin.add(playerObject);

  playerObject.Helm.Unload();
  playerObject.HelmMask.Unload();
  playerObject.Pants.Unload();
  playerObject.Gloves.Unload();
  playerObject.Boots.Unload();
  void settle(
    playerObject.loadPartAsync('Player/', playerObject.Armor, CHAOS_CASTLE_BODY),
    `Player/${CHAOS_CASTLE_BODY}`
  );

  void playerObject.setWingsAsync(null);
  void playerObject.setBodyPetAsync(null);
}

export const AppearanceSystem: ISystemFactory = world => {
  const query = world.with('charAppearance', 'modelObject', 'visibility');

  return {
    update: () => {
      for (const entity of query) {
        const { charAppearance, modelObject, visibility, attributeSystem } =
          entity;
        if (visibility.state === 'hidden') continue;
        if (!charAppearance.changed) continue;
        if (!modelObject.Ready) continue;
        // A character wearing a whole monster has no equipment sockets to
        // dress: the skin is the body (`controllers/actors/transformedBody.ts`).
        if (!isPlayerBody(modelObject)) continue;

        const playerObject = modelObject as PlayerObject;

        if (wearsChaosCastleSkin(entity, world.mapIndex)) {
          wearChaosCastleSkin(playerObject);
        } else {
          if (inCastleSkin.delete(playerObject)) {
            void settle(playerObject.setDefaultHelm(), 'Player/HelmClass');
          }

          loadPart(charAppearance.helm, playerObject, playerObject.HelmMask) ||
            playerObject.setDefaultMask();
          loadPart(charAppearance.armor, playerObject, playerObject.Armor) ||
            void settle(playerObject.setDefaultArmor(), 'Player/ArmorClass');
          loadPart(charAppearance.pants, playerObject, playerObject.Pants) ||
            void settle(playerObject.setDefaultPants(), 'Player/PantClass');
          loadPart(charAppearance.gloves, playerObject, playerObject.Gloves) ||
            void settle(playerObject.setDefaultGloves(), 'Player/GloveClass');
          loadPart(charAppearance.boots, playerObject, playerObject.Boots) ||
            void settle(playerObject.setDefaultBoots(), 'Player/BootClass');

          // c->Wing and the body-linked half of c->Helper. Both need their own
          // loader: the wing decides its bone (back vs cape) and blend mesh
          // before load, and the pet models live under Player/ rather than at
          // the Item/ path items.json carries for the horn items.
          void settle(playerObject.setWingsAsync(charAppearance.wings), 'wings');
          void settle(playerObject.setBodyPetAsync(charAppearance.pet), 'pet');
        }

        const held = heldWeapons(entity, world.mapIndex) ?? charAppearance;
        // Summoner books are never drawn on the character (`RenderLinkObject`
        // returns before them, ZzzCharacter.cpp:6453-6456).
        const mainHand = isBook(held.leftHand) ? null : held.leftHand;
        const offHand = isBook(held.rightHand) ? null : held.rightHand;
        loadPart(mainHand, playerObject, playerObject.Weapon1, 0) ||
          playerObject.Weapon1.Unload();
        loadPart(offHand, playerObject, playerObject.Weapon2, 1) ||
          playerObject.Weapon2.Unload();
        void settle(playerObject.setPhoenixWingAsync(0, mainHand), 'phoenix wing');
        void settle(playerObject.setPhoenixWingAsync(1, offHand), 'phoenix wing');

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
          held,
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
