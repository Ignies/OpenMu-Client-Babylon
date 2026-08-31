import {
  Color4,
  GPUParticleSystem,
  NoiseProceduralTexture,
  ParticleSystem,
  RawTexture,
  Texture,
  Vector3,
  type IParticleSystem,
  type Scene,
} from '../libs/babylon/exports';
import type { AmbientSchedule } from '../weather/ambientSchedule';
import { loadEffectTexture } from './moveTargetEffect';

/**
 * Ambient particle backbone: high-count, long-lived emitters —
 * weather, leaves, dust — that the CPU sprite pool (effectParticles.ts) is
 * the wrong tool for. Each recipe becomes one Babylon system:
 *
 *  - `GPUParticleSystem` when the engine can run it (WebGL2 transform
 *    feedback); the simulation never touches the CPU, so a few thousand
 *    raindrops cost one draw.
 *  - `ParticleSystem` otherwise (WebGL1 / blocked contexts) with a smaller
 *    capacity, so the same recipe still shows up, just thinner.
 *
 * Textures are shared through `loadEffectTexture` (one GPU texture per
 * file), and every recipe positions itself through an emitter `Vector3`
 * the owner moves each frame — weather follows the hero, room effects stay
 * put. The original's leaves / rain / snow (ZzzEffectFireLeave.cpp) ran
 * around `Hero->Object.Position`, which is the same idea.
 *
 * A `NoiseProceduralTexture` stands in for the original's per-tick random
 * walk (`Velocity += RangeFloat(-8, 7) * 0.1`): both paths read it, so a
 * leaf wanders the same way on either.
 */

export type AmbientBlend = 'alpha' | 'add';

/**
 * Generated sprites, for recipes whose data-file texture cannot do the job.
 *
 * `proc:streak` is the raindrop: a soft white vertical streak. The
 * original's `rain01` is a 4x32 TGA whose RGB is ~0.1 (28,20,18) — under
 * the original's `GL_ONE, GL_ONE` blend that adds a faint glint, and under
 * a straight-alpha blend it draws as **dark brown rain**. Additive of a
 * white streak is what a drop against a lit street actually reads as.
 *
 * ### The streak has to be WIDE enough to survive the frame
 *
 * The first cut put a Gaussian of variance 0.045 across an 8-texel sprite:
 * that is a bright core about two texels wide, and the `RAIN` recipe drew it
 * ~0.014 tiles across. At the game camera (radius 10, fov 0.8) a tile is
 * ~130 px, so the lit part of a drop landed on **under half a pixel**. A
 * sub-pixel additive streak is not dim, it is *sampled away*: the rasteriser
 * covers a fraction of the pixel, the tone-mapping curve in post then pulls
 * what little arrived toward the exposed mid-grey, and the rain disappears
 * exactly when post-processing is on. Rain that only reads with the grade
 * off is rain that does not work.
 *
 * So the core is broadened here and the recipe draws it wider (`scaleX`).
 * Both halves are needed: widening the sprite alone just stretches the same
 * two lit texels' worth of light over more pixels.
 */
const procedural = new Map<string, RawTexture>();

function proceduralTexture(scene: Scene, key: string): RawTexture {
  const have = procedural.get(key);
  if (have && have.getScene() === scene) return have;

  const w = 8;
  const h = 32;
  const data = new Uint8Array(w * h * 4);

  // Variance of the Gaussian across the streak. Was 0.045 — a two-texel core
  // in an eight-texel sprite, i.e. a quarter of the drop's width carrying
  // essentially all of its light. 0.13 lights about two thirds of the sprite
  // and still falls to ~0.15 at the edge, so the streak has a soft edge
  // rather than a hard one and there is something left to antialias.
  const ACROSS_VARIANCE = 0.13;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Gaussian across, tapered at both ends along.
      const u = (x + 0.5) / w - 0.5;
      const v = (y + 0.5) / h;
      const across = Math.exp(-(u * u) / ACROSS_VARIANCE);
      const along = Math.sin(v * Math.PI);
      const a = Math.round(255 * across * Math.sqrt(along));
      const i = (y * w + x) * 4;
      data[i] = a;
      data[i + 1] = a;
      data[i + 2] = a;
      data[i + 3] = a;
    }
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    w,
    h,
    scene,
    false,
    false,
    Texture.TRILINEAR_SAMPLINGMODE
  );
  texture.name = key;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.onDisposeObservable.addOnce(() => {
    if (procedural.get(key) === texture) procedural.delete(key);
  });
  procedural.set(key, texture);

  return texture;
}

export type AmbientRecipe = {
  readonly name: string;
  /** Data file, relative to the Data folder (`World1/leaf01.OZT`), or `proc:streak`. */
  readonly texture: string;
  readonly blend: AmbientBlend;
  /** Particles per second and the capacity the GPU path gets. */
  readonly rate: number;
  readonly capacity: number;
  /** Spawn box around the emitter (tiles). */
  readonly box: readonly [Vector3, Vector3];
  /** Direction cone (tiles/s after `power`). */
  readonly direction: readonly [Vector3, Vector3];
  readonly power: readonly [number, number];
  readonly life: readonly [number, number];
  readonly size: readonly [number, number];
  /** Per-axis sprite stretch (rain streaks); 1 = square. */
  readonly scaleX?: readonly [number, number];
  readonly scaleY?: readonly [number, number];
  readonly gravity?: Vector3;
  readonly angularSpeed?: readonly [number, number];
  readonly colour: readonly [Color4, Color4];
  readonly colourDead?: Color4;
  /** Noise wander strength per axis (tiles/s²-ish); none = straight flight. */
  readonly noise?: Vector3;
  /**
   * How the particle ITSELF changes with the system's strength, as the
   * fraction of each range in effect at the faintest emission. 1 everywhere
   * (the default, and what every recipe without this does) means only the
   * *number* of particles follows the strength.
   *
   * That default is wrong for rain and right for nearly everything else. A
   * gust of leaves is more leaves; a shower is not just more drops, it is
   * bigger and faster ones — the first spits of a shower are small, slow and
   * sparse, and a downpour is long fast streaks. With count as the only
   * variable, the difference between a drizzle and a downpour is density
   * alone, which is what makes a shower look like a tap being opened.
   *
   * `speed` also buys the drop its `life`: the lifetime is divided by the
   * same factor, so **a particle always falls the same distance** whatever
   * the intensity — it just takes longer to do it when the rain is light.
   * That invariant is what lets a recipe promise its particles reach the
   * ground (see `RAIN`) without the promise breaking at low strength.
   */
  readonly growth?: {
    /** Sprite size at the faintest emission, as a fraction of `size`. */
    readonly size: number;
    /** Streak length, as a fraction of `scaleY`. */
    readonly length: number;
    /** Fall speed, as a fraction of `power`. Also divides `life`. */
    readonly speed: number;
  };
  /** Stretch the sprite along its velocity (rain). */
  readonly stretched?: boolean;
  /** Fade in/out ramp as colour gradients (0 = hard). */
  readonly fade?: number;
  /**
   * Seconds the *emit rate* needs to cross the whole 0…1 strength range.
   * The owner only ever sets a target (`setStrength`); the live rate walks
   * toward it at this speed, so a recipe starting, stopping or gusting thins
   * out and thickens up instead of switching. Default `DEFAULT_RAMP`.
   */
  readonly ramp?: number;
  /**
   * Episode schedule off the shared clock. Absent = runs whenever its slot is
   * eligible (interior dust, packet-driven rain); present = the owner scales
   * `rate` by `ambientStrengthAt`, so weather comes and goes in gusts every
   * client agrees on.
   */
  readonly schedule?: AmbientSchedule;
};

export type AmbientSystem = {
  readonly emitter: Vector3;
  readonly system: IParticleSystem;
  readonly gpu: boolean;
  /** Seconds the live strength needs to cross the whole 0…1 range. */
  readonly ramp: number;
  /**
   * The longest a particle emitted right now can live, in seconds. Read by
   * the owner to decide how long a draining system must be left alone before
   * it is safe to dispose.
   *
   * A reader rather than `recipe.life[1]`, because `growth` moves it: light
   * rain falls slowly and its drops live proportionally longer, so the
   * recipe's own number is a floor and not the answer.
   */
  maxLife(): number;
  /** Asks for an emit-rate scale; the live rate eases toward it (0 = drain). */
  setStrength(k: number): void;
  /** Walks the live rate toward the target. Call once a frame. */
  update(dt: number): void;
  /** The scale actually in effect right now, after easing. */
  strength(): number;
  dispose(): void;
};

/** CPU fallback capacity relative to the GPU one. */
const CPU_CAPACITY_SCALE = 0.35;

/**
 * Default seconds for the emit rate to travel the full 0…1 range.
 *
 * Nothing about an ambient system is allowed to be instant. A recipe that
 * starts at its full rate drops a whole field of leaves into the air over one
 * particle lifetime, and one disposed the moment it stops being eligible takes
 * every leaf still flying with it — both read as a pop. Emission ramps
 * instead, and what is already in the air drains through its own lifetime.
 */
const DEFAULT_RAMP = 2.5;

let supported: boolean | null = null;

/** Whether this engine can run the GPU path (cached after the first ask). */
export function ambientGpuSupported(): boolean {
  if (supported === null) {
    try {
      supported = GPUParticleSystem.IsSupported;
    } catch {
      supported = false;
    }
  }
  return supported;
}

/** Shared wander noise, one per scene. */
const noiseBySceneUid = new Map<number, NoiseProceduralTexture>();

function wanderNoise(scene: Scene): NoiseProceduralTexture {
  const key = scene.getUniqueId();
  let noise = noiseBySceneUid.get(key);
  if (!noise) {
    noise = new NoiseProceduralTexture('ambientWander', 256, scene);
    noise.animationSpeedFactor = 4;
    noise.persistence = 1.8;
    noise.brightness = 0.5;
    noise.octaves = 3;
    noiseBySceneUid.set(key, noise);
    scene.onDisposeObservable.addOnce(() => {
      noiseBySceneUid.delete(key);
    });
  }
  return noise;
}

export function createAmbientSystem(
  scene: Scene,
  recipe: AmbientRecipe,
  at: Vector3
): AmbientSystem {
  const gpu = ambientGpuSupported();
  const emitter = at.clone();

  const capacity = gpu
    ? recipe.capacity
    : Math.max(32, Math.round(recipe.capacity * CPU_CAPACITY_SCALE));

  const system: ParticleSystem | GPUParticleSystem = gpu
    ? new GPUParticleSystem(`ambient:${recipe.name}`, { capacity }, scene)
    : new ParticleSystem(`ambient:${recipe.name}`, capacity, scene);

  system.emitter = emitter;
  system.isLocal = false;
  system.blendMode =
    recipe.blend === 'add'
      ? ParticleSystem.BLENDMODE_ADD
      : ParticleSystem.BLENDMODE_STANDARD;

  const [boxMin, boxMax] = recipe.box;
  system.minEmitBox = boxMin;
  system.maxEmitBox = boxMax;
  system.direction1 = recipe.direction[0];
  system.direction2 = recipe.direction[1];
  system.minEmitPower = recipe.power[0];
  system.maxEmitPower = recipe.power[1];
  system.minLifeTime = recipe.life[0];
  system.maxLifeTime = recipe.life[1];
  system.minSize = recipe.size[0];
  system.maxSize = recipe.size[1];

  if (recipe.scaleX) {
    system.minScaleX = recipe.scaleX[0];
    system.maxScaleX = recipe.scaleX[1];
  }
  if (recipe.scaleY) {
    system.minScaleY = recipe.scaleY[0];
    system.maxScaleY = recipe.scaleY[1];
  }

  system.gravity = recipe.gravity ?? Vector3.Zero();

  if (recipe.angularSpeed) {
    system.minAngularSpeed = recipe.angularSpeed[0];
    system.maxAngularSpeed = recipe.angularSpeed[1];
    system.minInitialRotation = 0;
    system.maxInitialRotation = Math.PI * 2;
  }

  const [c1, c2] = recipe.colour;
  system.color1 = c1;
  system.color2 = c2;
  system.colorDead = recipe.colourDead ?? new Color4(c2.r, c2.g, c2.b, 0);

  if (recipe.fade && recipe.fade > 0) {
    const f = Math.min(0.45, recipe.fade);
    system.addColorGradient(0, new Color4(c1.r, c1.g, c1.b, 0));
    system.addColorGradient(f, c1, c2);
    system.addColorGradient(1 - f, c1, c2);
    system.addColorGradient(1, new Color4(c2.r, c2.g, c2.b, 0));
  }

  if (recipe.noise) {
    system.noiseTexture = wanderNoise(scene);
    system.noiseStrength = recipe.noise;
  }

  if (recipe.stretched) {
    system.isBillboardBased = true;
    system.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
  }

  /**
   * Rewrite the per-particle ranges for the strength the system is now at.
   *
   * Only newly emitted particles take these: every one of the four is bound
   * to the update shader from the live property each frame (GPU path) or read
   * at emission (CPU path), so a drop already falling keeps the size and
   * speed the sky had when it left the cloud. That is the behaviour we want
   * and not a compromise — a shower easing off should not shrink the drops
   * already in the air, it should stop making new big ones.
   */
  function applyGrowth(k: number): void {
    const g = recipe.growth;
    if (!g) return;

    const t = k <= 0 ? 0 : k >= 1 ? 1 : k;
    const size = g.size + (1 - g.size) * t;
    const length = g.length + (1 - g.length) * t;
    const speed = g.speed + (1 - g.speed) * t;

    system.minSize = recipe.size[0] * size;
    system.maxSize = recipe.size[1] * size;

    if (recipe.scaleY) {
      system.minScaleY = recipe.scaleY[0] * length;
      system.maxScaleY = recipe.scaleY[1] * length;
    }

    system.minEmitPower = recipe.power[0] * speed;
    system.maxEmitPower = recipe.power[1] * speed;

    // Life pays for the speed, so the fall distance is invariant. See the
    // `growth` doc on the recipe.
    system.minLifeTime = recipe.life[0] / speed;
    system.maxLifeTime = recipe.life[1] / speed;
  }

  // Rate is scaled live via setStrength; the rate itself is the 1.0 mark.
  // It starts at zero and climbs in `update`, so a system that has just been
  // created thickens up rather than arriving whole.
  const ramp = Math.max(0.001, recipe.ramp ?? DEFAULT_RAMP);
  let target = 0;
  let strength = 0;
  system.emitRate = 0;

  // At zero: the smallest, slowest, longest-lived particles the recipe has.
  // Nothing is emitted before the first `update`, but the ranges have to be
  // right for the first frame that does emit.
  applyGrowth(0);

  // Never into the depth buffer: these sit over everything like the sprite
  // pool does, and the GPU path cannot sort against the scene anyway.
  system.forceDepthWrite = false;

  let disposed = false;

  if (recipe.texture.startsWith('proc:')) {
    system.particleTexture = proceduralTexture(scene, recipe.texture);
  } else {
    void loadEffectTexture(scene, recipe.texture).then(texture => {
      if (!disposed) system.particleTexture = texture;
    });
  }

  system.start();

  return {
    emitter,
    system,
    gpu,
    ramp,
    maxLife() {
      return system.maxLifeTime;
    },
    setStrength(k: number) {
      target = Math.max(0, k);
    },
    update(dt: number) {
      if (strength === target) return;
      // Rate-limited rather than exponential: an exponential tail never quite
      // reaches zero, so a draining system would dribble particles forever
      // instead of going quiet.
      const step = dt / ramp;
      strength =
        strength < target
          ? Math.min(target, strength + step)
          : Math.max(target, strength - step);
      system.emitRate = recipe.rate * strength;
      applyGrowth(strength);
    },
    strength() {
      return strength;
    },
    dispose() {
      disposed = true;
      // Never the texture: the recipe file and the wander noise are shared
      // across every ambient system (loadEffectTexture, wanderNoise), so the
      // default `dispose(true)` would take the rain away with the leaves.
      system.dispose(false);
    },
  };
}
