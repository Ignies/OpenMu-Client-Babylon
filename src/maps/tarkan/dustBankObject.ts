import { MapTileObject } from '../../common/mapTileObject';
import { spawnParticle } from '../../common/effectParticles';
import type { Scene } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/** `for (int i = 0; i < 20; ++i) CreateParticleFpsChecked(...)` (ZzzObject.cpp:2962). */
const BURST_COUNT = 20;

/**
 * `Luminosity = 0.6f; Vector(L*0.6, L*0.5, L*0.4, o->Light)`
 * (ZzzEffectParticle.cpp:5416) — the SubType 6 dust colour, fixed, ignoring
 * whatever light was passed in.
 */
const DUST_LIGHT: readonly [number, number, number] = [0.36, 0.3, 0.24];

/**
 * `cloud21` sizes itself `(rand(20) + 180) * 0.01 * scale` off a 256 px
 * texture; SubType 6 sizes itself `(rand%20+180)*0.01` off a 64 px one and
 * then oscillates between 1.3 and 2.3 (:5414). Matching the *world* size —
 * ~1.3 tiles across — means scaling the bigger texture down by 64/256 and a
 * little more for the oscillation midpoint. Without this the bank would be
 * five tiles wide per sprite, twenty sprites deep, and would cost more fill
 * rate than the rest of the map together.
 */
const CLOUD_SCALE = 0.27;

/**
 * Tarkan 60 (ZzzObject.cpp:2959-2969), ×82 — the low dust banks that sit in
 * the hollows all over the desert, at scales 0.74 to ~1.3.
 *
 * ```cpp
 * case 60:
 *     if (o->HiddenMesh != -2)
 *         for (int i = 0; i < 20; ++i)
 *             CreateParticleFpsChecked(BITMAP_SMOKE, o->Position, o->Angle, o->Light, 6, o->Scale);
 *     o->HiddenMesh = -2;
 *     break;
 * ```
 *
 * A one-shot: 20 puffs the first frame the object is drawn, then hidden for
 * good. That reads like a burst and is not one — SubType 6 puffs are
 * **immortal**. Their move case re-pins `o->LifeTime = 10` every frame
 * (ZzzEffectParticle.cpp:5411) and only bobs them:
 * `Position[2] = Rotation + sin((WorldTime + Gravity) / 5000) * 20` with a
 * per-sprite `Gravity` phase, scale breathing on a 3 minute period. So the
 * original spends 20 particles, once, to build a permanent patch of ground
 * haze about two tiles wide, and never touches it again.
 *
 * **Two divergences, both forced by there being no immortal kind to spawn.**
 * `cloud21` is the closest available — its `init` is nearly SubType 6's
 * (`px/py += rand(200) - 100`, scale `(rand(20)+180)*0.01`, tinted by the
 * passed light) — but it lives 100 ticks and then dies, so our bank fades
 * after ~4 s instead of standing forever. And because the marker is
 * effect-only (meshless), it is never `OutOfView`, so the burst fires when
 * the object enters the 32-tile load radius rather than when it is first
 * *rendered* — dust can appear behind the camera. A `smoke6` kind fixes the
 * first and makes the second harmless:
 *
 * ```ts
 * smoke6: {
 *   texture: 'smoke',
 *   blend: 'add',
 *   init(p, scale) {
 *     p.lifeTime = 10;
 *     p.gravity = rand(1000);          // per-sprite phase, ms
 *     p.scale = (rand(20) + 180) * 0.01;
 *     p.px += (rand(200) - 100) * scale;
 *     p.py += (rand(200) - 100) * scale;
 *     p.pz += rand(20) + 20;
 *     p.angleZ = p.pz;                 // base height; velocity is zero here,
 *     p.rotation = rand(360);          // so angleZ is free (the original
 *   },                                 // parks it in Rotation and spins)
 *   update(p, _f, t) {
 *     p.lifeTime = 10;                 // pinned: these never expire
 *     p.pz = p.angleZ + Math.sin((t + p.gravity) / 5000) * 20;
 *     p.scale =
 *       Math.sin((((p.gravity + t) % 1800) * 0.1 * Math.PI) / 180) * 0.5 + 1.8;
 *     p.lr = 0.36; p.lg = 0.3; p.lb = 0.24;
 *   },
 *   color: plainColor,
 * } satisfies ParticleKind,
 * ```
 *
 * Note that an immortal kind needs a disposal story the pool does not have
 * today (nothing frees a particle that never dies), which is the other reason
 * it is not being smuggled in here.
 */
export class TarkanDustBankObject extends MapTileObject {
  #scene: Scene | null = null;

  #burned = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.#scene = world.scene;
  }

  dispose(): void {
    this.#scene = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const scene = this.#scene;

    if (this.#burned || !scene) return;

    // `o->HiddenMesh = -2` runs whether or not the burst did, so the flag is
    // set before the spawn loop, not after it: one burst per lifetime of the
    // object, exactly as in the C++.
    this.#burned = true;

    const scale = this.node.scaling.x * CLOUD_SCALE;

    for (let i = 0; i < BURST_COUNT; i++) {
      void spawnParticle(
        scene,
        'cloud21',
        this.node.position,
        this.node.rotation.y,
        scale,
        DUST_LIGHT
      );
    }
  }
}
