import type { Entity, ISystemFactory, Item } from '../world';
import {
  itemVisualTier,
  setItemGlowClock,
  strongestTier,
  type ItemVisualTier,
} from '../../common/itemVisualTier';
import {
  improvedItemEffectsOn,
  itemEffectSignature,
} from '../../common/itemEffectMode';
import type { PlayerObject } from '../../common/playerObject';
import type { ModelObject } from '../../common/modelObject';
import {
  createItemAura,
  type ItemAura,
  type ItemAuraKind,
} from '../../effects/itemAura';
import { createItemCrackle, type ItemCrackle } from '../../effects/itemCrackle';
import type { ItemSparkleKind } from '../../effects/itemSparkle';
import { effects, type EffectHandle } from '../../effects';
import { entityGone, entityPos, entityYaw, followEntity, tmpA } from '../../effects/core';
import { requestGlowProbe } from '../../scenes/sceneLook';
import { EventBus } from '../../libs/eventBus';
import { itemSelfLight, lightItem, type ItemLampKind } from '../../lighting/items';
import type { LightSource } from '../../lighting/lightSource';

/**
 * Item glow.
 *
 *  - Stamps `metadata.itemTier` on item meshes once their model is in
 *    (`PlayerObject.loadPartAsync` does the first stamp for gear; this system
 *    re-stamps everything when the item-effects option or the level cap
 *    changes, because tiers are baked per option state). itemMaterial.ts
 *    (legacy passes) and the GlowLayer selector in sceneLook.ts read it.
 *  - Improved look only: +9…+15 gear gets a lamp — one light source from the
 *    lighting layer's `items` entry, following the body — plus an aura and a
 *    crackle (effects/). Dropped +9…+15 items do the same, static.
 *  - Both looks: an excellent item — worn or on the ground — throws the
 *    `CreateShiny` star glints (`effects/itemSparkle.ts`), on the body for a
 *    wearer, beside and above the drop for a drop.
 *
 * This system decides *which* entity is lit and keeps the lamp's position on
 * the wearer; the light itself (range, colour, priority, the terrain stain)
 * is `src/lighting/items.ts`.
 */

type Lamp = {
  tier: ItemVisualTier;
  /** Shared with the light source, the aura and the crackle; moved in place. */
  position: { x: number; y: number; z: number };
  source: LightSource | null;
  /**
   * The world generation this lamp's scene objects were built in. A map load
   * takes the scene they live in with it, so a lamp from an older generation
   * has to be rebuilt even though the gear that made it never changed.
   */
  gen: number;
  aura: ItemAura | null;
  crackle: ItemCrackle | null;
};

type Tracked = {
  signature: string;
  lamp: Lamp | null;
  stamped: boolean;
  /** An excellent item is here: keep a sparkle alive (re-spawned after a map reset). */
  sparkleWanted: boolean;
  sparkle: EffectHandle | null;
};

function anyExcellent(app: NonNullable<Entity['charAppearance']>): boolean {
  return !!(
    app.leftHand?.isExcellent ||
    app.rightHand?.isExcellent ||
    app.helm?.isExcellent ||
    app.armor?.isExcellent ||
    app.pants?.isExcellent ||
    app.gloves?.isExcellent ||
    app.boots?.isExcellent
  );
}

function itemSignature(item: Item | null | undefined): string {
  if (!item) return '-';
  return `${item.group}:${item.num}:${item.lvl ?? 0}:${item.isExcellent ? 1 : 0}:${
    item.isAncient ? 1 : 0
  }:${item.socketCount ?? 0}`;
}

function stampMeshes(part: ModelObject, item: Item | null | undefined): void {
  const tier = itemVisualTier(item);
  // A tier stamp is what wakes the GlowLayer up (sceneLook's layer gate).
  if (item && tier.active) requestGlowProbe();
  for (const mesh of part.getMeshes(true)) {
    mesh.metadata ??= {};
    mesh.metadata.itemTier = item && tier.active ? tier : null;
    mesh.metadata.itemLvl = tier.level;
    mesh.metadata.isExcellent = tier.isExcellent;
    mesh.metadata.timeOffset = 0;
  }
}

/** Equipment slots and the part they load into (appearanceSystem.ts). */
function stampPlayer(player: PlayerObject, app: NonNullable<Entity['charAppearance']>): void {
  stampMeshes(player.HelmMask, app.helm);
  stampMeshes(player.Armor, app.armor);
  stampMeshes(player.Pants, app.pants);
  stampMeshes(player.Gloves, app.gloves);
  stampMeshes(player.Boots, app.boots);
  stampMeshes(player.Weapon1, app.leftHand);
  stampMeshes(player.Weapon2, app.rightHand);
}

export const ItemGlowSystem: ISystemFactory = world => {
  const players = world.with('charAppearance', 'modelObject', 'transform');
  const drops = world.with('droppedItem', 'modelObject', 'transform');

  const tracked = new Map<Entity, Tracked>();

  let optionState = itemEffectSignature();

  function clock(): number {
    return world.gameTime.TotalGameTime.TotalSeconds;
  }

  function lightLamp(
    tier: ItemVisualTier,
    x: number,
    y: number,
    z: number,
    kind: ItemLampKind,
    auraKind: ItemAuraKind
  ): Lamp {
    const position = { x, y, z };

    return {
      tier,
      position,
      source: lightItem(world.scene, tier, kind, position),
      gen: worldGen,
      aura: createItemAura(world.scene, tier, auraKind, x, y, z),
      crackle: createItemCrackle(world.scene, tier, auraKind, x, y, z),
    };
  }

  /** Anything to draw for this tier in the improved look besides emissive? */
  function wantsLamp(tier: ItemVisualTier): boolean {
    return tier.lightGain > 0 || tier.auraRate > 0 || tier.crackleRate > 0;
  }

  function snuff(state: Tracked): void {
    if (!state.lamp) return;
    // Idempotent: after a map change the facade already disposed it.
    state.lamp.source?.dispose();
    state.lamp.aura?.dispose();
    state.lamp.crackle?.dispose();
    state.lamp = null;
  }

  function stateOf(e: Entity): Tracked {
    let state = tracked.get(e);
    if (!state) {
      state = { signature: '', lamp: null, stamped: false, sparkleWanted: false, sparkle: null };
      tracked.set(e, state);
    }
    return state;
  }

  /** `CreateShiny`: the glints an excellent item throws; ends with the entity. */
  function spawnSparkle(e: Entity, kind: ItemSparkleKind): EffectHandle {
    return effects.spawn('itemSparkle', world.scene, entityPos(e, 0, tmpA), {
      kind,
      follow: followEntity(e, 0),
      yaw: () => entityYaw(e),
      until: () => entityGone(e),
    });
  }

  /** Keeps exactly one live sparkle while wanted (a map reset ends the old one). */
  function keepSparkle(e: Entity, state: Tracked, kind: ItemSparkleKind): void {
    if (state.sparkleWanted) {
      if (!state.sparkle?.alive) state.sparkle = spawnSparkle(e, kind);
    } else if (state.sparkle) {
      state.sparkle.stop();
      state.sparkle = null;
    }
  }

  function forget(e: Entity): void {
    const state = tracked.get(e);
    if (!state) return;
    snuff(state);
    state.sparkle?.stop();
    state.sparkle = null;
    e.modelObject?.SelfLight.setAll(0);
    tracked.delete(e);
  }

  players.onEntityRemoved.subscribe(forget);
  drops.onEntityRemoved.subscribe(forget);

  /** The map the lamps were built against, and the generation counter. */
  let lampWorld = world.mapIndex;
  let worldGen = 0;

  // Loading a map disposes every light source (`lighting.reset()`) and takes
  // the scene the auras live in with it. Map objects are recreated with their
  // map so they re-light on their own; a worn item lamp is the one thing that
  // outlives the load, so the generation bump re-seats it at the wearer's new
  // position on the next apply of their items. Note what it is *not* for: the
  // crackle vanishing across a gate was never this — see itemCrackle.ts's
  // `disposeCrackleMaterial`, which is the actual cause and the actual fix.
  EventBus.on('warpCompleted', ({ map }) => {
    // Warping to the map you are already on reloads nothing.
    if (map === lampWorld) return;
    lampWorld = map;
    worldGen++;
  });

  const selfColour = { r: 0, g: 0, b: 0 };

  return {
    update: () => {
      const now = clock();
      setItemGlowClock(now);

      const lampsOn = improvedItemEffectsOn();

      // Option changed: every baked tier is stale — re-stamp and re-light.
      const options = itemEffectSignature();
      const restamp = options !== optionState;
      optionState = options;

      // --- dropped items ----------------------------------------------------
      for (const e of drops) {
        const state = stateOf(e);
        const { modelObject, transform, droppedItem } = e;

        keepSparkle(e, state, 'drop');
        if (state.stamped && !restamp) continue;
        if (!modelObject.Ready) continue;

        const tier = itemVisualTier(droppedItem.item);
        state.sparkleWanted = tier.isExcellent;
        stampMeshes(modelObject, droppedItem.item);

        snuff(state);
        if (lampsOn && wantsLamp(tier)) {
          state.lamp = lightLamp(
            tier,
            transform.pos.x,
            transform.pos.y,
            transform.pos.z,
            'drop',
            'drop'
          );
        }

        state.stamped = true;
      }

      // --- characters -------------------------------------------------------
      for (const e of players) {
        const state = stateOf(e);
        const { charAppearance: app, modelObject, transform } = e;

        // The apply counter leads: the lamp belongs to this character's
        // items, so it is re-examined whenever those items are put on the
        // model, not only when they come out different — re-applying the same
        // gear is exactly what a warp does.
        const signature =
          options +
          '|' +
          (app.applied ?? 0) +
          '|' +
          itemSignature(app.leftHand) +
          '|' +
          itemSignature(app.rightHand) +
          '|' +
          itemSignature(app.helm) +
          '|' +
          itemSignature(app.armor) +
          '|' +
          itemSignature(app.pants) +
          '|' +
          itemSignature(app.gloves) +
          '|' +
          itemSignature(app.boots);

        if (signature !== state.signature) {
          state.signature = signature;
          state.sparkleWanted = anyExcellent(app);

          const tier = strongestTier([
            app.leftHand,
            app.rightHand,
            app.helm,
            app.armor,
            app.pants,
            app.gloves,
            app.boots,
          ]);

          // Re-examined is not rebuilt. itemVisualTier interns its tiers, so
          // identity is the whole comparison: same tier, same generation, and
          // the lamp standing there is the one this gear would build anyway.
          //
          // This guard is load-bearing, not an optimisation. The apply beat
          // fires on every inventory move, and a rebuild throws away the
          // crackle's GreasedLine mesh and compiles a fresh ShaderMaterial
          // for the replacement. Doing that on repeat is how a shader compile
          // starts failing, and a material whose shader fails to compile
          // renders WHITE — see the note above.
          const stale =
            restamp ||
            !state.lamp ||
            state.lamp.tier !== tier ||
            state.lamp.gen !== worldGen;

          if (stale) {
            snuff(state);
            modelObject.SelfLight.setAll(0);

            if (restamp && modelObject.Ready) {
              stampPlayer(modelObject as PlayerObject, app);
            }

            if (lampsOn && wantsLamp(tier)) {
              state.lamp = lightLamp(
                tier,
                transform.pos.x,
                transform.pos.y,
                transform.pos.z,
                e.localPlayer ? 'hero' : 'player',
                'character'
              );
            }
          }
        }

        keepSparkle(e, state, 'character');

        const lamp = state.lamp;
        if (!lamp) continue;

        const x = transform.pos.x + (transform.posOffset?.x ?? 0);
        const y = transform.pos.y + (transform.posOffset?.y ?? 0);
        const z = transform.pos.z + (transform.posOffset?.z ?? 0);

        // The light source follows this object; the tile re-registration of
        // the terrain stain is its own business.
        lamp.position.x = x;
        lamp.position.y = y;
        lamp.position.z = z;

        lamp.aura?.emitter.set(x, y, z);
        lamp.crackle?.position.set(x, y, z);

        if (!lamp.source?.alive) continue;

        // The wearer is lit by their own gear, as the original adds o->Light.
        const c = itemSelfLight(lamp.source, selfColour);
        modelObject.SelfLight.set(c.r, c.g, c.b);
      }
    },
  };
};
