import type { Entity, World } from '../../ecs/world';
import { effects } from '../../effects';
import { bonePos, tmpA } from '../../effects/core';
import { FIRE_PUFF } from '../../effects/recipes';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

/**
 * Death Gorgon is `MODEL_GORGON` with `c->Level == 2`, and that level is the
 * whole difference: the body burns and the fire lights the floor
 * (ZzzCharacter.cpp:5943-5958). The floor light is the lighting layer's -
 * `CHARACTER_LIGHTS[35]` carries the (0.8, 0.16, 0) range-2 row - and this is
 * the fire it comes from.
 *
 * Not ported: `o->BlendMeshLight = (rand() % 10) * 0.1f` (:5945), the
 * additive mesh pass flickering on both Gorgons. `goldenMonsters.ts` records
 * the same gap.
 */

/** `rand_fps_check(1)` is every 25 Hz tick; throttled to keep the budget. */
const BURN_INTERVAL = 0.1;

/** `for (i < 10) CreateParticle(BITMAP_FIRE, BoneTransform[rand()], …)` (:5949). */
const BURN_PARTICLES = 4;

// [NpcInfo(35, "Death Gorgon")] (ZzzCharacter.cpp:13623-13633)
export class DeathGorgon extends MonsterObject {
  static {
    DeathGorgon.OverrideScale = monsterScaleOf(35);
  }

  BlendMesh = 1;

  #world: World | null = null;
  #entity: Entity | null = null;
  #nextBurn = 0;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#world = world;
    this.#entity = entity;

    this.load(await loadGLTF(monsterModelFile(11), world));
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const world = this.#world;
    const entity = this.#entity;
    if (!this.Ready || this.OutOfView || !world || !entity || entity.dying) {
      return;
    }

    const bones = this.gltf?.skeleton?.bones.length ?? 0;
    if (bones < 2) return;

    const now = gameTime.TotalGameTime.TotalSeconds;
    if (now < this.#nextBurn) return;
    this.#nextBurn = now + BURN_INTERVAL;

    for (let i = 0; i < BURN_PARTICLES; i++) {
      bonePos(entity, Math.floor(Math.random() * (bones - 1)), tmpA);
      effects.spawn('particles', world.scene, tmpA, {
        recipe: FIRE_PUFF,
        count: 1,
      });
    }
  }
}
