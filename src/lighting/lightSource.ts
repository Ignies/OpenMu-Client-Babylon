import type { Scene } from '../libs/babylon/exports';
import { registerPointLightEmitter } from '../common/pointLightPool';
import {
  registerTerrainLight,
  type TerrainLightColor,
} from '../common/terrainDynamicLight';

/**
 * The one registration — shared by every entry in this folder.
 *
 * Everything that emits light goes through the same two sinks: the terrain
 * delta texture (`common/terrainDynamicLight.ts`, MU's `AddTerrainLight`)
 * and the pooled per-pixel `PointLight`s (`common/pointLightPool.ts`). A
 * `LightSource` is that pair registered once, driven by a `LightRecipe`
 * (plain data) and an anchor (a position the host mutates, a `follow`
 * callback, or a `travel` target), with an envelope, flicker or pulse, tile
 * re-registration while it moves, and its own removal when it ends.
 *
 * Entries own sources; the facade ticks them (`tickLightSources`) and drops
 * them on a map change (`disposeAllLightSources`). Nothing else registers
 * into the sinks — lighting is a
 * layer".
 *
 * What the original does, for reference: ZzzEffect.cpp lights the ground
 * under 70-odd effects every frame they exist (BITMAP_FLAME range 3,
 * BITMAP_LIGHTNING 6, MODEL_WAVE 5, MODEL_FISSURE 10, every arrow type 2),
 * ZzzCharacter.cpp under the blacksmith's forge and the Devias trader's
 * brazier, and each light dies with its effect. Those need three things the
 * static map-object path lacks: a lifetime with an envelope, a position that
 * moves, and an instant start — the pool's 0.35 s fade-in turns a lightning
 * strike into a swell.
 *
 * Governing rule unchanged: sources only *add*. The original's negative
 * lights (Bloody Wolf / Tantallos `Vector(-1.3, -1.3, -1.3)`) have no
 * equivalent .
 */

export type LightFlicker = { min: number; max: number; steps: number };

export type LightPulse = {
  speed: number;
  amount: number;
  base: number;
  /** Milliseconds added to the clock — lamps that pulse out of step. */
  phase?: number;
};

/**
 * A colour that is not a constant: the callback writes the current linear
 * RGB into `out` every tick. For hosts whose colour is animated elsewhere
 * (item tiers breathe on the item-glow clock). The envelope still scales it.
 */
export type LightColorFn = (out: TerrainLightColor) => TerrainLightColor;

/**
 * A light, as data. Every field but `color` and `range` has a default, so a
 * recipe can be as short as `{ color: [1, 0.6, 0.3], range: 3 }`.
 */
export type LightRecipe = {
  /** Peak colour, linear RGB, or a callback that writes it. The envelope scales it. */
  readonly color: readonly [number, number, number] | LightColorFn;
  /** Terrain footprint radius in tiles — MU's `AddTerrainLight` range. */
  readonly range: number;
  /** Point-light radius in tiles; defaults to `range + POINT_RANGE_EXTRA`. */
  readonly pointRange?: number;
  /** Point-light intensity multiplier (`LightEmitter.pointGain`). */
  readonly gain?: number;
  /** Terrain floor multiplier (`LightEmitter.terrain.floorGain`). */
  readonly floorGain?: number;
  /** Terrain falloff exponent (`LightEmitter.terrain.falloff`). */
  readonly falloff?: number;
  /** Random flicker — MU's `Luminosity` roll. Wins over `pulse`. */
  readonly flicker?: LightFlicker;
  /**
   * Flicker chase per tick, 0…1. Defaults to FLICKER_SMOOTHING (0.25, event
   * lights). Map torches pass TORCH_FLICKER_SMOOTHING (0.12): slower, so a
   * hundred of them do not all twitch at once.
   */
  readonly flickerSmoothing?: number;
  /** Smooth sine on the luminosity: `(sin(ms * speed) + 1) * amount + base`. */
  readonly pulse?: LightPulse;
  /** Random jitter of the point light's position, in tiles. */
  readonly wander?: number;
  /** Height of the point light above the anchor, in tiles. */
  readonly heightOffset?: number;
  /** Pool priority: hero gear 2, players 1, torches 0. Defaults to PRIORITY_EFFECT. */
  readonly priority?: number;
  /**
   * Skip the pool's 0.35 s fade-in when taking a slot. Defaults to true —
   * an event light must be on the frame it is asked for. Torches and lamps
   * that exist for the whole map pass false and keep the cross-fade.
   */
  readonly instant?: boolean;
  /** Life in seconds. Omitted or `Infinity`: lives until `stop()`. */
  readonly seconds?: number;
  /** Seconds to reach the peak from zero. 0 = instant (default). */
  readonly attack?: number;
  /** Seconds of tail at the end. Defaults to 40 % of `seconds`, 0.3 s if endless. */
  readonly release?: number;
};

export type LightAnchor = {
  /** Start position. Held by reference — the host may mutate it to move. */
  readonly position: { x: number; y: number; z: number };
  /** Called every tick; write the current position into `out`. */
  readonly follow?: (out: { x: number; y: number; z: number }) => void;
  /**
   * Straight-line travel to `to` at `speed` tiles/second. The light ends on
   * arrival and `onArrive` fires — an impact flash belongs there.
   */
  readonly travel?: {
    readonly to: { x: number; y: number; z: number };
    readonly speed: number;
    readonly onArrive?: () => void;
  };
};

// ---- tuning ----------------------------------------------------------------

/**
 * Pool priority for event lights, above hero gear (2): a skill flash lasts
 * under two seconds and is the brightest thing in frame while it does — it
 * must never wait for a slot.
 */
export const PRIORITY_EFFECT = 3;

/** Pool priority for lights that belong to the map: torches, lamps, drops. */
export const PRIORITY_TORCH = 0;

/**
 * Tiles the point light reaches past the terrain footprint. The floor pool
 * is a tile cone; the walls and bodies around it are lit per pixel and read
 * further out.
 */
const POINT_RANGE_EXTRA = 2;

/**
 * Flicker chase per tick, 0…1. Higher than `effectLights`' 0.12 because event
 * lights are short and a lazy chase never reaches the roll before they end.
 */
const FLICKER_SMOOTHING = 0.25;

/** The map-object chase the old `effectLights` used; torch recipes opt in. */
export const TORCH_FLICKER_SMOOTHING = 0.12;

/** Share of a finite life spent in the release tail when none is given. */
const DEFAULT_RELEASE_SHARE = 0.4;

/** Seconds of tail for an endless source that is `stop()`ped. */
const ENDLESS_RELEASE = 0.3;

/** Tiles within which a travelling light is considered arrived. */
const ARRIVE_EPSILON = 0.05;

// ---- state -----------------------------------------------------------------

const live = new Set<LightSource>();

export class LightSource {
  readonly position: { x: number; y: number; z: number };

  readonly recipe: LightRecipe;

  #anchor: LightAnchor;

  #age = 0;

  /** Age at which `stop()` was called, or null while running. */
  #stoppedAt: number | null = null;

  #lumi: number;

  #color: TerrainLightColor = { r: 0, g: 0, b: 0 };

  #tileX = 0;

  #tileY = 0;

  #offTerrain: () => void = () => {};

  #offPoint: () => void = () => {};

  #dead = false;

  /**
   * Attach a light. It is on screen this frame and removes itself when its
   * envelope ends; an endless recipe must be `stop()`ped or `dispose()`d by
   * its host. `scene` is accepted for symmetry with every other spawn call
   * and for hosts that key pools by scene; the tick is the facade's.
   */
  static attach(
    _scene: Scene,
    recipe: LightRecipe,
    anchor: LightAnchor
  ): LightSource {
    const source = new LightSource(recipe, anchor);

    source.#register();
    live.add(source);

    return source;
  }

  private constructor(recipe: LightRecipe, anchor: LightAnchor) {
    this.recipe = recipe;
    this.#anchor = anchor;
    this.position = anchor.position;
    this.#lumi = recipe.flicker
      ? (recipe.flicker.min + recipe.flicker.max) / 2
      : recipe.pulse
        ? recipe.pulse.base + recipe.pulse.amount
        : 1;

    // First frame at the attack's starting value, so a zero-attack flash is
    // on screen the frame it is asked for rather than one tick later.
    this.#write((recipe.attack ?? 0) > 0 ? 0 : 1);
  }

  /** The current colour, as fed to both sinks. */
  get color(): TerrainLightColor {
    return this.#color;
  }

  get alive(): boolean {
    return !this.#dead;
  }

  /** Begin the release tail now. */
  stop(): void {
    if (this.#stoppedAt === null) this.#stoppedAt = this.#age;
  }

  /** Cut it dead — no tail. */
  dispose(): void {
    if (this.#dead) return;
    this.#dead = true;
    this.#offTerrain();
    this.#offPoint();
    live.delete(this);
  }

  #register(): void {
    const { recipe, position } = this;

    this.#registerTerrain();

    this.#offPoint = registerPointLightEmitter({
      position,
      heightOffset: recipe.heightOffset,
      range: recipe.pointRange ?? recipe.range + POINT_RANGE_EXTRA,
      gain: recipe.gain,
      wander: recipe.wander,
      priority: recipe.priority ?? PRIORITY_EFFECT,
      instant: recipe.instant ?? true,
      color: () => this.#color,
    });
  }

  /** The terrain footprint is baked at registration; redo it per tile. */
  #registerTerrain(): void {
    const { recipe, position } = this;

    this.#tileX = Math.floor(position.x);
    this.#tileY = Math.floor(position.z);

    this.#offTerrain = registerTerrainLight({
      x: position.x,
      y: position.z,
      range: recipe.range,
      falloff: recipe.falloff,
      floorGain: recipe.floorGain,
      color: () => this.#color,
    });
  }

  #envelope(): number {
    const { recipe } = this;
    const seconds = recipe.seconds ?? Infinity;
    const attack = recipe.attack ?? 0;
    const release =
      recipe.release ??
      (Number.isFinite(seconds)
        ? seconds * DEFAULT_RELEASE_SHARE
        : ENDLESS_RELEASE);

    let e = attack > 0 ? Math.min(1, this.#age / attack) : 1;

    const tailStart = Number.isFinite(seconds)
      ? Math.max(0, seconds - release)
      : Infinity;
    const from = Math.min(tailStart, this.#stoppedAt ?? Infinity);

    if (this.#age >= from) {
      e *= release > 0 ? Math.max(0, 1 - (this.#age - from) / release) : 0;
    }

    return e;
  }

  #write(e: number): void {
    const { color } = this.recipe;
    const k = e * this.#lumi;

    if (typeof color === 'function') {
      const c = color(this.#color);

      c.r *= k;
      c.g *= k;
      c.b *= k;

      return;
    }

    this.#color.r = color[0] * k;
    this.#color.g = color[1] * k;
    this.#color.b = color[2] * k;
  }

  /** @internal Driven by `tickLightSources`. */
  tick(dt: number): void {
    if (this.#dead) return;

    const { recipe, position } = this;
    const anchor = this.#anchor;

    this.#age += dt;

    if (anchor.travel) {
      const { to, speed } = anchor.travel;
      const dx = to.x - position.x;
      const dy = to.y - position.y;
      const dz = to.z - position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const step = speed * dt;

      if (dist <= Math.max(step, ARRIVE_EPSILON)) {
        position.x = to.x;
        position.y = to.y;
        position.z = to.z;

        if (this.#stoppedAt === null) {
          this.#stoppedAt = this.#age;
          anchor.travel.onArrive?.();
        }
      } else {
        const k = step / dist;

        position.x += dx * k;
        position.y += dy * k;
        position.z += dz * k;
      }
    } else if (anchor.follow) {
      anchor.follow(position);
    }

    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.z);

    if (tileX !== this.#tileX || tileY !== this.#tileY) {
      this.#offTerrain();
      this.#registerTerrain();
    }

    if (recipe.flicker) {
      const f = recipe.flicker;
      const step = Math.floor(Math.random() * f.steps);
      const target =
        f.min + (step * (f.max - f.min)) / Math.max(1, f.steps - 1);

      this.#lumi +=
        (target - this.#lumi) * (recipe.flickerSmoothing ?? FLICKER_SMOOTHING);
    } else if (recipe.pulse) {
      const p = recipe.pulse;

      this.#lumi =
        (Math.sin((this.#age * 1000 + (p.phase ?? 0)) * p.speed) + 1) *
          p.amount +
        p.base;
    }

    const e = this.#envelope();

    this.#write(e);

    const seconds = recipe.seconds ?? Infinity;
    const ended =
      (Number.isFinite(seconds) && this.#age >= seconds) ||
      (this.#stoppedAt !== null && e <= 0);

    if (ended) this.dispose();
  }
}

// ---- readers / lifecycle (called by the facade) ----------------------------

/** Every source alive right now, across all entries. */
export function liveLightSources(): ReadonlySet<LightSource> {
  return live;
}

/** Step every source. The facade calls this before the entries' `update`. */
export function tickLightSources(dt: number): void {
  for (const source of live) source.tick(dt);
}

/**
 * Everything, now. A map load rebuilds the terrain light field underneath
 * every registration; sources must not outlive the field they registered in.
 */
export function disposeAllLightSources(): void {
  for (const source of Array.from(live)) source.dispose();
  live.clear();
}
