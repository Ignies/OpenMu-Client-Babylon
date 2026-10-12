import type { Entity, ISystemFactory, Item } from '../world';
import type { ModelObject } from '../../controllers/render/modelObject';
import { heldWeapons } from '../../controllers/actors';
import { isPlayerBody } from '../../controllers/actors/playerObject';
import { WeaponSprites } from '../../controllers/actors/weaponSprites';
import { itemHeldSprites, type HeldWearer } from '../../controllers/item_fx/itemLooks';
import { legacyItemEffectsOn } from '../../controllers/item_fx/itemEffectMode';

/** One hand: the sprites bound to the model it held when they were made. */
type Hand = { sprites: WeaponSprites | null; gltf: ModelObject['gltf'] };

/**
 * The sprites `RenderLinkObject` puts on a held weapon every frame (ZzzCharacter.cpp:7027-8386), in the
 * hand or on the back: each hand's item look names them (`item_fx/itemLooks.ts` `held`), and they are
 * rebuilt when the hand's model changes. Drawn while the Item effects option draws the original passes.
 */
export const WeaponSpriteSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'charAppearance');
  const hands = new Map<Entity, [Hand, Hand]>();
  /** The wearer the sprites read this frame (`o->CurrentAction`, `c->SafeZone`), reused. */
  const wearer: HeldWearer = { action: 0, safeZone: false };

  function drop(entity: Entity): void {
    for (const hand of hands.get(entity) ?? []) hand.sprites?.dispose();
    hands.delete(entity);
  }

  query.onEntityRemoved.subscribe(drop);

  function sync(hand: Hand, socket: ModelObject, item: Item | null | undefined): void {
    const specs = item ? itemHeldSprites(item.group, item.num) : null;
    if (hand.gltf === socket.gltf && (hand.sprites?.specs ?? null) === specs) return;
    hand.sprites?.dispose();
    hand.gltf = socket.gltf;
    hand.sprites = specs && socket.gltf ? new WeaponSprites(world.scene, socket, specs) : null;
  }

  return {
    update: () => {
      const ms = world.gameTime.TotalGameTime.TotalSeconds * 1000;
      const on = legacyItemEffectsOn();
      for (const entity of query) {
        const model = entity.modelObject;
        if (!isPlayerBody(model)) continue;
        const held = heldWeapons(entity, world.mapIndex) ?? entity.charAppearance;
        let pair = hands.get(entity);
        if (!pair) {
          pair = [
            { sprites: null, gltf: null },
            { sprites: null, gltf: null },
          ];
          hands.set(entity, pair);
        }
        sync(pair[0], model.Weapon1, held.leftHand);
        sync(pair[1], model.Weapon2, held.rightHand);
        const shown = on && entity.visibility?.state !== 'hidden';
        wearer.action = model.CurrentAction;
        wearer.safeZone = entity.attributeSystem?.isAboveZero('inSafeZone') ?? false;
        pair[0].sprites?.update(ms, model.Light, shown, wearer);
        pair[1].sprites?.update(ms, model.Light, shown, wearer);
      }
    },
  };
};
