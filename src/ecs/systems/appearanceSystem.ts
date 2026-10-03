import { ItemsDatabase } from '../../common/itemsDatabase';
import { itemVisualTier } from '../../common/itemVisualTier';
import { heldWeapons, wearsChaosCastleSkin } from '../../common/chaosCastleUnit';
import type { ModelObject } from '../../common/modelObject';
import { isPlayerBody, type PlayerObject } from '../../common/playerObject';
import { applyWeaponAttachments } from '../../common/weaponAttachment';
import { isBook, swordformGlovesModel } from '../../common/weaponClass';
import type { ISystemFactory, Item } from '../world';

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

  playerObject.loadPartAsync(
    item.szModelFolder,
    socket,
    worn,
    part.lvl,
    part.isExcellent,
    itemVisualTier(part)
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
  void playerObject.loadPartAsync(
    'Player/',
    playerObject.Armor,
    CHAOS_CASTLE_BODY
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
        // dress: the skin is the body (`common/transformedBody.ts`).
        if (!isPlayerBody(modelObject)) continue;

        const playerObject = modelObject as PlayerObject;

        if (wearsChaosCastleSkin(entity, world.mapIndex)) {
          wearChaosCastleSkin(playerObject);
        } else {
          if (inCastleSkin.delete(playerObject)) {
            void playerObject.setDefaultHelm();
          }

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
        void playerObject.setPhoenixWingAsync(0, mainHand);
        void playerObject.setPhoenixWingAsync(1, offHand);

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
