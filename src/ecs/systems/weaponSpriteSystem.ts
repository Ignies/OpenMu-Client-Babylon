import type { Entity, ISystemFactory, Item } from '../world';
import type { ModelObject } from '../../controllers/render/modelObject';
import { heldWeapons } from '../../controllers/actors';
import { isPlayerBody } from '../../controllers/actors/playerObject';
import { WeaponSprites } from '../../controllers/actors/weaponSprites';
import { entityYaw } from '../../controllers/fx/core';
import { itemHeldSet, itemWingSet, type HeldSet, type HeldWearer } from '../../controllers/item_fx/itemLooks';
import { legacyItemEffectsOn } from '../../controllers/item_fx/itemEffectMode';

/** One model a hand's item draws on: the sprites bound to the model it held when they were made. */
type Hand = { sprites: WeaponSprites | null; gltf: ModelObject['gltf']; set: HeldSet | null };

type Sets = (group: number, num: number) => HeldSet | null;

/**
 * The sprites `RenderLinkObject` puts on a held weapon every frame (ZzzCharacter.cpp:7027-8386), in the
 * hand or on the back, and on its phoenix wing, and what it creates there (sparks, drops): each hand's
 * item look names them (`item_fx/itemLooks.ts` `held`, `emit`, `wing`), and they are rebuilt when the model
 * changes. Drawn while the Item effects option draws the original passes.
 */
export const WeaponSpriteSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'charAppearance');
  const hands = new Map<Entity, Hand[]>();
  /** The wearer the sprites read this frame (`o->CurrentAction`, `c->SafeZone`, `o->Angle[2]`, the map), reused. */
  const wearer: HeldWearer = { action: 0, safeZone: false, yaw: 0, map: -1 };

  function drop(entity: Entity): void {
    for (const hand of hands.get(entity) ?? []) hand.sprites?.dispose();
    hands.delete(entity);
  }

  query.onEntityRemoved.subscribe(drop);

  function sync(hand: Hand, socket: ModelObject, item: Item | null | undefined, setOf: Sets): void {
    const set = item ? setOf(item.group, item.num) : null;
    if (hand.gltf === socket.gltf && hand.set === set) return;
    hand.sprites?.dispose();
    hand.gltf = socket.gltf;
    hand.set = set;
    hand.sprites = set && socket.gltf ? new WeaponSprites(world.scene, socket, set.sprites, set.emitters) : null;
  }

  return {
    update: (dt: number) => {
      const ms = world.gameTime.TotalGameTime.TotalSeconds * 1000;
      const on = legacyItemEffectsOn();
      for (const entity of query) {
        const model = entity.modelObject;
        if (!isPlayerBody(model)) continue;
        const held = heldWeapons(entity, world.mapIndex) ?? entity.charAppearance;
        let set = hands.get(entity);
        if (!set) {
          set = [0, 1, 2, 3].map(() => ({ sprites: null, gltf: null, set: null }));
          hands.set(entity, set);
        }
        sync(set[0], model.Weapon1, held.leftHand, itemHeldSet);
        sync(set[1], model.Weapon2, held.rightHand, itemHeldSet);
        if (model.PhoenixWing1) sync(set[2], model.PhoenixWing1, held.leftHand, itemWingSet);
        if (model.PhoenixWing2) sync(set[3], model.PhoenixWing2, held.rightHand, itemWingSet);
        const shown = on && entity.visibility?.state !== 'hidden';
        wearer.action = model.CurrentAction;
        wearer.safeZone = entity.attributeSystem?.isAboveZero('inSafeZone') ?? false;
        wearer.yaw = entityYaw(entity);
        wearer.map = world.mapIndex;
        for (let i = 0; i < set.length; i++) set[i].sprites?.update(ms, model.Light, shown, wearer, dt);
      }
    },
  };
};
