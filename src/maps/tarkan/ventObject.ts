import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter, type Emission } from '../../common/effectParticles';
import type { Entity, World } from '../../ecs/world';

const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * One vent's duty cycle: a window inside a `WorldTime % period` loop, and
 * what it spits while it is open. The original writes both as literals inside
 * `RenderObjectVisual`; here they are per-object because type 83 phases its
 * window by the object's own yaw.
 */
type VentWindow = {
  readonly period: number;
  readonly start: number;
  readonly end: number;
  readonly emissions: readonly Emission[];
};

/**
 * The shared half of Tarkan's timed dust vents (ZzzObject.cpp:2996-3044):
 * a hidden marker that emits only inside a window of a `WorldTime` loop.
 *
 * The window is tested against `WorldTime`, not against a per-object timer
 * like Atlans' bubble vent (ZzzObject.cpp:4009) — that difference is in the
 * original and is deliberate on both sides. A Tarkan quake is a *map* event:
 * every type 83 within earshot goes off inside the same second, offset only
 * by the yaw the designer gave it, and that is what makes it read as one
 * tremor rather than as ten independent smoke pots.
 *
 * Leaving the emitter un-ticked outside the window is exactly "no dust":
 * `ParticleEmitter` accumulates from its own delta and clamps the backlog to
 * four ticks, so it cannot burst on the frame the window reopens.
 */
abstract class TimedVentObject extends MapTileObject {
  #window: VentWindow | null = null;

  #emitter: ParticleEmitter | null = null;

  /** `o->Angle[2]` is degrees in the map record; see glowLampObject.ts. */
  protected abstract vent(yawDegrees: number): VentWindow;

  async init(world: World, entity: Entity): Promise<void> {
    const window = this.vent(
      (entity.transform?.rot.y ?? 0) * DEGREES_PER_RADIAN
    );

    this.#window = window;

    await super.init(world, entity);

    this.#emitter = new ParticleEmitter(
      world.scene,
      window.emissions,
      this.node.position,
      this.node.rotation.y,
      this.node.scaling.x
    );
  }

  dispose(): void {
    this.#emitter = null;
    this.#window = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const window = this.#window;
    const emitter = this.#emitter;

    if (!window || !emitter) return;

    const phase = (gameTime.TotalGameTime.TotalSeconds * 1000) % window.period;

    if (phase > window.start && phase < window.end) emitter.update();
  }
}

/**
 * `if (((int)WorldTime % 5000) > 4500) Smoke = true;` (ZzzObject.cpp:3000) —
 * half a second of dust in every five, in phase across the whole map.
 */
const SAND_VENT_PERIOD = 5000;
const SAND_VENT_START = 4500;

/**
 * `CreateParticleFpsChecked(BITMAP_SMOKE, ..., 4, o->Scale)` (:3003) — one
 * per 25 Hz reference tick while the window is open, so twelve or thirteen
 * puffs a burst.
 *
 * SubType 4 is `smoke0`'s motion exactly — `LifeTime 16`,
 * `Scale (rand%32+48)*0.01` *ignoring* the `Scale` argument,
 * `Luminosity = LifeTime / 8`, `Gravity += 0.2`, `Scale += 0.05`
 * (ZzzEffectParticle.cpp:1146, :5395) — with one difference: it is tinted
 * `(120, 100.7, 80) / 255`, a sand colour, where `smoke0` is white. `smoke0`
 * ignores `Emission.light`, so the tint cannot be passed in; it wants its own
 * kind:
 *
 * ```ts
 * smoke4: {
 *   texture: 'smoke',
 *   blend: 'add',
 *   init(p) {
 *     p.lifeTime = 16;
 *     p.scale = (rand(32) + 48) * 0.01;
 *     p.rotation = rand(360);
 *   },
 *   update(p, f) {
 *     const lum = p.lifeTime / 8;
 *     p.lr = lum * (120 / 255);
 *     p.lg = lum * (100.7 / 255);
 *     p.lb = lum * (80 / 255);
 *     p.gravity += 0.2 * f;
 *     p.pz += p.gravity * f;
 *     p.scale += f * 0.05;
 *   },
 *   color: plainColor,
 * } satisfies ParticleKind,
 * ```
 */
const SAND_VENT_EMISSIONS: readonly Emission[] = [
  { kinds: ['smoke0'], every: 1 },
];

/**
 * Tarkan 76 (ZzzObject.cpp:2996-3007), ×19 — the sand puffs along the dune
 * ridges and the buried-hand hollows, clustered eight-deep around 81.8/169.7.
 */
export class TarkanSandVentObject extends TimedVentObject {
  protected vent(): VentWindow {
    return {
      period: SAND_VENT_PERIOD,
      start: SAND_VENT_START,
      end: SAND_VENT_PERIOD,
      emissions: SAND_VENT_EMISSIONS,
    };
  }
}

/**
 * ```cpp
 * int inter  = (int)o->Angle[2] * 10;
 * int timing = (int)WorldTime % 10000;
 * if (timing > 3500 + inter && timing < 4000 + inter) Smoke = true;
 * ```
 * ZzzObject.cpp:3011-3015. Half a second of dust in every ten, offset by ten
 * milliseconds per degree of the object's own yaw. EncTerrain9.obj gives type
 * 83 five yaws — -90, -60, 0, 90, 150 — so the ten vents fire in three waves
 * spread over 2.4 s, which is the tremor rolling across the valley.
 */
const QUAKE_PERIOD = 10000;
const QUAKE_START = 3500;
const QUAKE_END = 4000;
const QUAKE_PHASE_MS_PER_DEGREE = 10;

/**
 * The quake's three streams (ZzzObject.cpp:3017-3029):
 *
 *  - `CreateParticleFpsChecked(BITMAP_SMOKE, pos, ..., 8, o->Scale)` every
 *    tick — the ground burst. SubType 8 throws itself along -Y at
 *    `(rand%8+32)*0.3`, keeps `Scale *= 0.8` of the object's scale, then
 *    swells and climbs (`Scale += Gravity`, `Position[2] += Gravity * 20`)
 *    while damping its lateral velocity to 0.42 a tick, white and fading over
 *    24 ticks (ZzzEffectParticle.cpp:1319, :5432). `smoke60` is the closest
 *    available: additive, grey, scale-aware, rising and growing. It is softer
 *    and much longer-lived (60 ticks), so the burst lingers where the
 *    original's snaps.
 *  - `rand_fps_check(3)` — a 1-in-3 tick — adds a SubType 4 puff at
 *    `(rand%128-64, rand%128-64)` around the vent at half scale. That is
 *    `smoke0` + `jitter: 64` (see the SubType 4 note above; SubType 4 ignores
 *    the scale argument in the original too, so `smoke0` ignoring
 *    `Emission.scale` costs nothing here).
 *  - the same roll spawns `MODEL_STONE1 + rand()%2`, a *falling rock model*.
 *    We have no effect-model system — nothing can spawn a short-lived,
 *    self-moving, non-entity model — so it runs as `waterfall5_9`, the one
 *    kind that falls, at the size a small stone would be. This is the same
 *    substitution `DUNGEON_EMISSIONS` makes for the ceiling rock-fall, and
 *    the two should be revisited together when that system exists.
 */
const QUAKE_EMISSIONS: readonly Emission[] = [
  { kinds: ['smoke60'], every: 1 },
  { kinds: ['smoke0'], every: 3, jitter: 64 },
  { kinds: ['waterfall5_9'], every: 3, scale: 0.15, jitter: 64 },
];

/**
 * Tarkan 83 (ZzzObject.cpp:3008-3033), ×10 — the quake vents, at scales 1.0
 * to 2.1, eight of them inside one 32-tile radius at 108.9/237.0.
 */
export class TarkanQuakeVentObject extends TimedVentObject {
  protected vent(yawDegrees: number): VentWindow {
    // `(int)o->Angle[2]` truncates toward zero before the multiply, and the
    // offset is signed: a -90 deg vent fires 900 ms *early*, at 2600-3100 ms
    // into the loop. Every yaw the map actually uses keeps the window inside
    // the period; a yaw below -350 deg would push it negative and the vent
    // would simply never fire, which is equally true of the original.
    const offset = Math.trunc(yawDegrees) * QUAKE_PHASE_MS_PER_DEGREE;

    return {
      period: QUAKE_PERIOD,
      start: QUAKE_START + offset,
      end: QUAKE_END + offset,
      emissions: QUAKE_EMISSIONS,
    };
  }
}
