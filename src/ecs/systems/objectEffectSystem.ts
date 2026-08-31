import { Vector3 } from '../../libs/babylon/exports';
import { EventBus } from '../../libs/eventBus';
import { playBurst, type BurstKind } from '../../effects/bursts';
import { playSfx } from '../../libs/sfx';
import { TerrainDecal } from '../../common/moveTargetEffect';
import { dropTier, type DropTier } from '../../common/dropTier';
import { lighting } from '../../lighting';
import type { Entity, ISystemFactory } from '../world';

/**
 * Renders server-driven object effects:
 *  - `objectEffect` events (ShowEffect / ShowSwirl / level-up) → particle bursts
 *    at the object (effects/bursts.ts).
 *  - dropped items: a soft ground glow under excellent / high-level drops so
 *    valuable loot reads from a distance (tier colours from dropTier.ts).
 */

const GLOW_TEXTURE = 'Effect/flare01.OZJ';
const GLOW_SCALE = 1.4;
const GLOW_LIGHT: Record<Exclude<DropTier, 'normal'>, [number, number, number]> = {
  excellent: [0.25, 0.7, 0.3],
  high: [0.7, 0.55, 0.15],
  money: [0.6, 0.5, 0.1],
};

const tmp = new Vector3();

export const ObjectEffectSystem: ISystemFactory = world => {
  const drops = world.with('droppedItem', 'transform');
  const glows = new Map<Entity, TerrainDecal>();
  const pool: TerrainDecal[] = [];
  let glowSeq = 0;

  function positionOf(e: Entity, height: number): Vector3 {
    const t = e.transform!;
    return tmp.set(
      t.pos.x + (t.posOffset?.x ?? 0),
      t.pos.y + height,
      t.pos.z + (t.posOffset?.z ?? 0)
    );
  }

  EventBus.on('objectEffect', ({ entity, effect }) => {
    // ReceiveLevelUp (WSclient.cpp:6476, :9027): SOUND_LEVEL_UP with the flare burst.
    if (effect === 'levelUp') playSfx('Sound/pLevelUp', entity.transform.pos);
    const kind: BurstKind = effect;
    playBurst(world.scene, kind, positionOf(entity, 0).clone());

    // The burst also lights the ground and whoever stands by — the lighting
    // layer's `objectEffects` entry owns the recipe and the follow.
    lighting.objectEffect(world.scene, entity, effect);
  });

  drops.onEntityAdded.subscribe(e => {
    const tier = dropTier(e.droppedItem);
    if (tier === 'normal') return;
    const decal =
      pool.pop() ??
      new TerrainDecal(world, `dropGlow${glowSeq++}`, GLOW_TEXTURE, GLOW_SCALE);
    decal.setAlpha(0.6);
    decal.draw(
      world,
      e.transform.pos.x + 0.5,
      e.transform.pos.z + 0.5,
      GLOW_SCALE,
      0,
      GLOW_LIGHT[tier]
    );
    glows.set(e, decal);
  });

  drops.onEntityRemoved.subscribe(e => {
    const decal = glows.get(e);
    if (!decal) return;
    decal.hide();
    glows.delete(e);
    pool.push(decal);
  });

  return {
    update: () => {
      // Decals drape lazily once their texture arrives.
      for (const [e, decal] of glows) {
        if (decal.enabled) continue;
        const tier = dropTier(e.droppedItem!);
        if (tier === 'normal') continue;
        decal.draw(
          world,
          e.transform!.pos.x + 0.5,
          e.transform!.pos.z + 0.5,
          GLOW_SCALE,
          0,
          GLOW_LIGHT[tier]
        );
      }
    },
  };
};
