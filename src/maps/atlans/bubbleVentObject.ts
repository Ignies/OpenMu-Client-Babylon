import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter, type Emission } from '../../common/effectParticles';
import type { Entity, World } from '../../ecs/world';

/** `FPS_ANIMATION_FACTOR` normalises per-frame work to REFERENCE_FPS (ZzzAI.cpp:729). */
const TICKS_PER_SECOND = 25;

/** `o->Timer += 0.1f * FPS_ANIMATION_FACTOR` per 25 Hz tick (ZzzObject.cpp:4009). */
const TIMER_PER_TICK = 0.1;

/** `if (o->Timer > 10.f) o->Timer = 0.f` (:4010) — 100 ticks, 4 s at the reference rate. */
const TIMER_WRAP = 10;

/** `if (o->Timer > 5.f) CreateParticleFpsChecked(...)` (:4011) — emits over the second half. */
const TIMER_EMIT_ABOVE = 5;

/**
 * The vent's bubbles. `BITMAP_BUBBLE` is `Object8/drop01.jpg`
 * (MapManager.cpp:40) drawn as a nine-frame flipbook, spawned at SubType 0:
 * `LifeTime 30+rand%10`, `Scale (rand%6+4)*0.03` — 0.12-0.27 of a 64 px
 * sprite, so 8-17 world units across — and per tick
 * `Position += (rand%20-10)*2.5*Scale` on X/Y with `(rand%20+10)*2.5*Scale`
 * on Z: a small dot that wobbles as it climbs (ZzzEffectParticle.cpp:196,
 * :4145).
 *
 * **There is no bubble kind in `effectParticles.ts` and this file cannot add
 * one.** `smoke65` is the closest available: additive, grey, scale-aware,
 * rising with a lateral sway, 45 ticks of life. At `scale` 0.5 it lands on
 * 10-20 world units, which is the right size; what it is not is round, and it
 * fades instead of popping. It also fixes its own colour (`lum * 0.4` grey),
 * so no `light` is passed here — it would be ignored. The kind that should
 * exist is:
 *
 * ```ts
 * // TEXTURES: bubble: { file: 'Object8/drop01.OZJ', size: 64, frames: 9 },
 * //   drop01 is a 3x3 flipbook inside a 4x4 UV grid — the renderer picks
 * //   (Frame%3, Frame/3) * 0.25 (ZzzEffectParticle.cpp:8945) — so either the
 * //   TEXTURES entry needs a cell remap [0,1,2,4,5,6,8,9,10] or the sprite
 * //   manager needs cellWidth = cellHeight = size/4 with frames = 11.
 * bubble: {
 *   texture: 'bubble',
 *   blend: 'add',
 *   init(p, scale) {
 *     p.lifeTime = 30 + rand(10);
 *     p.scale = (rand(6) + 4) * 0.03 * scale;
 *     p.frames = 9;
 *   },
 *   update(p, f) {
 *     p.frame++;
 *     p.px += (rand(20) - 10) * 2.5 * p.scale * f;
 *     p.py += (rand(20) - 10) * 2.5 * p.scale * f;
 *     p.pz += (rand(20) + 10) * 2.5 * p.scale * f;
 *     p.lr = p.lg = p.lb = 1;
 *   },
 *   color: plainColor,
 * } satisfies ParticleKind,
 * ```
 *
 * `every: 5` rather than the original's every tick is a budget decision, not
 * a taste one. EncTerrain8.obj places 845 vents and puts 160 of them inside
 * the 32-tile load radius at the worst spot; effect-only objects are meshless
 * so `updateFrustumVisibility` can never mark them `OutOfView` and they all
 * emit whether or not the camera is pointed at them. One bubble per tick each
 * would ask for ~2000 spawns a second against a 2048-sprite pool with a 1.8 s
 * lifetime — the pool would be exhausted and which vent won would be down to
 * iteration order. One per five ticks holds the worst case near 700 live
 * sprites, and a vent puffing five bubbles a second still reads as a vent.
 */
const BUBBLES: readonly Emission[] = [
  { kinds: ['smoke65'], every: 5, scale: 0.5 },
];

/**
 * Atlans 22 (ZzzObject.cpp:4007-4012): a hidden marker that vents bubbles for
 * two seconds in every four. 845 of them line the trenches, the palace
 * courtyards and the reef walls, sitting 0-4 tiles above the seabed.
 *
 * The timer is reproduced in the original's own units rather than as a phase
 * of `WorldTime`, because it is *per object*: `o->Timer` starts at 0 when the
 * object is created, so a field of vents that streamed in as the player
 * walked toward it never breathes in unison. A `WorldTime % 4000` window
 * would have every vent on the map pulse together.
 */
export class AtlansBubbleVentObject extends MapTileObject {
  #emitter: ParticleEmitter | null = null;

  #timer = 0;

  /** Previous `TotalGameTime`; `gameTime` carries no per-frame delta. */
  #lastSeconds = -1;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.#emitter = new ParticleEmitter(
      world.scene,
      BUBBLES,
      this.node.position,
      this.node.rotation.y,
      this.node.scaling.x
    );
  }

  dispose(): void {
    this.#emitter = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const emitter = this.#emitter;
    if (!emitter) return;

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    // The emitter accumulates from its own delta, so leaving it un-ticked for
    // the silent half of the cycle is exactly "no bubbles" — no catch-up
    // burst when it resumes (ParticleEmitter clamps its backlog at 4 ticks).
    this.#timer += TIMER_PER_TICK * delta * TICKS_PER_SECOND;

    if (this.#timer > TIMER_WRAP) this.#timer = 0;

    if (this.#timer > TIMER_EMIT_ABOVE) emitter.update();
  }
}
