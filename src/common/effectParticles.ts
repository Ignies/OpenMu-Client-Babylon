import { TILE_CM } from './terrain/consts';
import {
  Color4,
  Constants,
  Sprite,
  SpriteManager,
  type Scene,
} from '../libs/babylon/exports';
import { downloadDataFile, hasDataFile } from '../libs/mu/dataFolder';
import { maps } from '../maps';

const TICKS_PER_SECOND = 25;


const OZJ_HEADER_SIZE = 24;

const POOL_SIZE = 2048;

type TextureKey =
  | 'smoke'
  | 'cloud'
  | 'fire01'
  | 'fire03'
  | 'fireHik1'
  | 'fireHik2'
  | 'fireHik3'
  | 'fireHik3Mono'
  | 'waterfall5'
  | 'spark03'
  | 'flareBlue'
  | 'clud64';

const TEXTURES: Record<
  TextureKey,
  { file: string; size: number; frames?: number }
> = {
  smoke: { file: 'Effect/smoke01.OZJ', size: 64 },
  cloud: { file: 'Effect/clouds.OZJ', size: 256 },
  fire01: { file: 'Effect/Fire01.OZJ', size: 64, frames: 4 },
  fire03: { file: 'Effect/Fire03.OZJ', size: 64, frames: 4 },
  fireHik1: { file: 'Effect/firehik01.OZJ', size: 64 },
  fireHik2: { file: 'Effect/firehik02.OZJ', size: 64 },
  fireHik3: { file: 'Effect/firehik03.OZJ', size: 64 },
  fireHik3Mono: { file: 'Effect/firehik_mono03.OZJ', size: 64 },
  waterfall5: { file: 'Effect/waterFall5.OZJ', size: 64 },
  spark03: { file: 'Effect/Spark03.OZJ', size: 32 },
  flareBlue: { file: 'Effect/flareBlue.OZJ', size: 64 },
  clud64: { file: 'Effect/clud64.OZJ', size: 64 },
};

type Blend = 'add' | 'subtract';

type Particle = {
  live: boolean;
  kind: ParticleKind;
  sprite: Sprite;
  lifeTime: number;
  scale: number;
  alpha: number;
  gravity: number;
  rotation: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  angleZ: number;
  lr: number;
  lg: number;
  lb: number;
  tr: number;
  tg: number;
  tb: number;
  pixelSize: number;
  frame: number;
  frames: number;
};

type ParticleKind = {
  readonly texture: TextureKey;
  readonly blend: Blend;
  init(p: Particle, scale: number, light: readonly [number, number, number]): void;
  update(p: Particle, f: number, worldTimeMs: number): void;
  color(p: Particle, out: Color4): void;
};

const rand = (n: number) => Math.floor(Math.random() * n);

const WHITE: readonly [number, number, number] = [1, 1, 1];

const plainColor = (p: Particle, out: Color4) => out.set(p.lr, p.lg, p.lb, 1);

function fireKind(
  texture: TextureKey,
  opts: {
    lifeBase: number;
    lifeRand: number;
    fadeBelow: number;
    gravityBase: number;
    shrinkBase: number;
    shrinkRand: number;
    scaleBase?: number;
    gravityRand?: number;
    drift?: boolean;
  }
): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = rand(5) + opts.lifeBase;
      p.scale = (rand(72) + (opts.scaleBase ?? 72)) * 0.01 * scale;
      p.rotation = rand(360);
      p.gravity = (rand(opts.gravityRand ?? 24) + opts.gravityBase) * 0.1;
      p.alpha = 0;

      [p.tr, p.tg, p.tb] = light;
      p.lr = p.lg = p.lb = 0;

      if (opts.drift) {
        const r = rand(50) * 0.03;
        p.vx = 2.5 + r;
        p.vy = -5 - r;
        p.vz = 0;
      }
    },
    update(p, f) {
      if (p.lifeTime < opts.fadeBelow) {
        p.alpha -= f * 0.2;
      } else if (p.alpha < 1) {
        p.alpha += f * (rand(2) + 2) * 0.1;
      } else {
        p.alpha = 1;
      }

      if (p.alpha < 0.1) {
        p.live = false;
        return;
      }

      p.lr = p.tr * p.alpha;
      p.lg = p.tg * p.alpha;
      p.lb = p.tb * p.alpha;

      if (p.scale > 0) {
        p.scale -= f * (rand(opts.shrinkRand) + opts.shrinkBase) * 0.01;
      } else {
        p.live = false;
        return;
      }

      p.pz += p.gravity * f;
      p.rotation += 3 * f;
    },
    color: plainColor,
  };
}

function stripFireKind(texture: TextureKey): ParticleKind {
  return {
    texture,
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 24;

      p.vz = (rand(16) + 32) * 0.1;

      p.scale = (rand(64) + 128) * 0.01 * scale;
      p.rotation = 0;

      [p.tr, p.tg, p.tb] = light;
    },
    update(p, fps) {
      p.gravity += 0.004 * fps;
      p.scale -= 0.04 * fps;
      p.frame = Math.floor((23 - p.lifeTime) / 6);
      p.pz += p.gravity * 10 * fps;

      const luminosity = p.lifeTime / 24;

      p.lr = p.tr * luminosity;
      p.lg = p.tg * luminosity;
      p.lb = p.tb * luminosity;
    },
    color: plainColor,
  };
}

const KINDS = {
  fire1: fireKind('fireHik1', {
    lifeBase: 27,
    lifeRand: 5,
    fadeBelow: 15,
    gravityBase: 64,
    shrinkBase: 5,
    shrinkRand: 3,
  }),

  fire3: fireKind('fireHik3', {
    lifeBase: 17,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 64,
    shrinkBase: 7,
    shrinkRand: 3,
  }),

  fire2: fireKind('fireHik2', {
    lifeBase: 24,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 100,
    shrinkBase: 6,
    shrinkRand: 3,
    drift: true,
  }),

  fire157: fireKind('fireHik3Mono', {
    lifeBase: 17,
    lifeRand: 5,
    fadeBelow: 10,
    gravityBase: 44,
    gravityRand: 14,
    scaleBase: 52,
    shrinkBase: 7,
    shrinkRand: 3,
  }),

  ember: {
    texture: 'spark03',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = rand(12) + 20;
      p.scale = (rand(60) + 90) * 0.01 * scale;
      p.rotation = rand(360);
      p.alpha = 1;

      p.gravity = (rand(12) + 10) * 0.1;

      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;

      p.angleZ = 0;
      p.vx = Math.cos(a) * r;
      p.vy = Math.sin(a) * r;
      p.vz = 0;

      [p.tr, p.tg, p.tb] = light;
    },
    update(p, f) {
      p.gravity += 0.03 * f;
      p.pz += p.gravity * f;

      p.rotation += 5 * f;
      p.scale -= 0.004 * f;

      const t = Math.max(0, Math.min(1, p.lifeTime / 26));

      const flicker = 0.75 + Math.random() * 0.25;

      p.lr = p.tr * t * flicker;
      p.lg = p.tg * t * t * flicker;
      p.lb = p.tb * t * t * t * flicker;
    },
    color: plainColor,
  },

  fire0: stripFireKind('fire01'),

  fire0b: stripFireKind('fire03'),

  smoke0: {
    texture: 'smoke',
    blend: 'add',
    init(p) {
      p.lifeTime = 16;
      p.scale = (rand(32) + 48) * 0.01;
      p.rotation = rand(360);
    },
    update(p, fps) {
      const luminosity = p.lifeTime / 8;

      p.lr = p.lg = p.lb = luminosity;

      p.gravity += 0.2 * fps;
      p.pz += p.gravity * fps;
      p.scale += fps * 0.05;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke2: {
    texture: 'smoke',
    blend: 'subtract',
    init(p) {
      p.lifeTime = 50;
      p.scale = (rand(64) + 64) * 0.01;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, fps) {
      const luminosity = p.lifeTime / 50;

      p.lr = p.lg = p.lb = luminosity;

      p.gravity -= 0.1 * fps;
      p.px -= p.gravity * 0.2 * fps;
      p.pz += p.gravity * fps;
      p.scale -= fps * 0.01;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke65: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 45;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(10) + 18) * 0.1;
    },
    update(p, f, worldTimeMs) {
      const luminosity = p.lifeTime / 40;

      p.lr = p.lg = p.lb = luminosity * 0.4;

      p.gravity -= 0.05 * f;
      p.px += p.gravity * Math.sin(worldTimeMs) * 0.05 * f;
      p.pz += p.gravity * f;
    },
    color: plainColor,
  } satisfies ParticleKind,

  cloud21: {
    texture: 'cloud',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 100;
      p.gravity = rand(1000);
      p.alpha = 0.6;

      p.px += rand(200) - 100;
      p.py += rand(200) - 100;
      p.pz += rand(20) - 20;

      p.scale = (rand(20) + 180) * 0.01 * scale;
      [p.lr, p.lg, p.lb] = light;
    },
    update(p, f) {
      if (p.lifeTime <= 0) {
        p.live = false;
      } else if (p.lifeTime > 50) {
        if (p.alpha < 1) p.alpha += f * 0.04;
        p.pz += 2 * f;
      } else {
        if (p.alpha > 0.1) p.alpha -= f * 0.005;
        p.pz -= 1 * f;
      }
    },
    color: (p, out) =>
      out.set(p.lr * p.alpha, p.lg * p.alpha, p.lb * p.alpha, 1),
  } satisfies ParticleKind,

  smoke21: {
    texture: 'smoke',
    blend: 'subtract',
    init(p, scale) {
      p.lifeTime = 80;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, f) {
      const lum = p.lifeTime / 50;
      p.lr = p.lg = p.lb = lum;

      p.gravity -= 0.1 * f;
      p.px -= p.gravity * 0.2 * f;
      p.pz += p.gravity * f;
      p.scale -= f * 0.01;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke22: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 60;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
    },
    update(p, f, t) {
      const lum = p.lifeTime / 50;
      p.lr = lum * 0.9;
      p.lg = lum * 0.5;
      p.lb = lum * 0.5;

      p.gravity -= 0.1 * f;
      p.px += p.gravity * Math.sin(t) * 0.05 * f;
      p.pz += p.gravity * f;
      p.scale += f * 0.04;
    },
    color: plainColor,
  } satisfies ParticleKind,

  smoke60: {
    texture: 'smoke',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 60;
      p.scale = scale * (rand(64) + 64) * 0.005;
      p.rotation = rand(360);
      p.gravity = (rand(32) + 60) * 0.1;
      p.lr = p.lg = p.lb = 0.4;
    },
    update(p, f, t) {
      const lum = p.lifeTime / 50;
      p.lr = p.lg = p.lb = lum * 0.4;

      p.gravity -= 0.1 * f;
      p.px += p.gravity * Math.sin(t) * 0.05 * f;
      p.pz += p.gravity * f;
      p.scale += f * 0.04;
    },
    color: plainColor,
  } satisfies ParticleKind,

  waterfall5_9: {
    texture: 'waterfall5',
    blend: 'add',
    init(p, scale) {
      p.lifeTime = 30;
      p.rotation = rand(360);
      p.scale = 0.6 + scale;
      p.vz = -(rand(5) + 7);
      p.lr = p.lg = p.lb = 0.2;
    },
    update(p, f) {
      p.scale -= f * 0.005;
      p.vz += 0.1 * f;

      const gain =
        p.lifeTime < 8
          ? Math.pow(1 / 1.2, f)
          : p.lifeTime > 20
            ? Math.pow(1.1, f)
            : 1;

      p.lr *= gain;
      p.lg *= gain;
      p.lb *= gain;
    },
    color: plainColor,
  } satisfies ParticleKind,

  spark03_24: {
    texture: 'spark03',
    blend: 'add',
    init(p) {
      p.alpha = 1;

      p.vx = (rand(3) - 1) * 2;
      p.vy = (rand(3) - 1) * 2;
      p.vz = (rand(3) - 1) * 2;

      p.lifeTime = 16;
      p.rotation = 0;
      p.scale = rand(5) / 10 + 0.4;
    },
    update(p, f) {
      if (p.lifeTime < 10 && p.rotation === 0) {
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.vz = -p.vz;
        p.rotation = 1;
      }

      if (p.lifeTime <= 10) {
        p.alpha -= f * 0.05;
        if (p.alpha < 0) p.alpha = 0;

        const gain = Math.pow(p.alpha, f);
        p.lr *= gain;
        p.lg *= gain;
        p.lb *= gain;
      }

      p.scale -= f * 0.02;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * Wings of Darkness membrane flare (ZzzObject.cpp:9860-9884). The original
   * re-creates a BITMAP_FLARE_BLUE sprite at each of ten wing bones every
   * frame; a short-lived pooled particle reads the same and costs a tenth of
   * the sprites.
   */
  wingFlareBlue: {
    texture: 'flareBlue',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 6;
      p.scale = scale;
      p.rotation = rand(360);
      [p.tr, p.tg, p.tb] = light;
    },
    update(p) {
      // Sprite scale follows sinf(WorldTime * 0.004) * 0.3 + 0.3 in the
      // original; the emitter passes that in, so only the fade is left.
      const t = Math.max(0, Math.min(1, p.lifeTime / 6));
      p.lr = p.tr * t;
      p.lg = p.tg * t;
      p.lb = p.tb * t;
    },
    color: plainColor,
  } satisfies ParticleKind,

  /**
   * Wing of Storm cloud aura (ZzzObject.cpp:9896-9915): BITMAP_CLUD64 at 25
   * wing bones, luminosity |sin(WorldTime * 0.0004)| * 0.4 + 0.5.
   */
  wingCloud: {
    texture: 'clud64',
    blend: 'add',
    init(p, scale, light) {
      p.lifeTime = 8;
      p.scale = scale;
      p.rotation = rand(360);
      [p.tr, p.tg, p.tb] = light;
    },
    update(p, f) {
      const t = Math.max(0, Math.min(1, p.lifeTime / 8));
      p.rotation += f;
      p.lr = p.tr * t;
      p.lg = p.tg * t;
      p.lb = p.tb * t;
    },
    color: plainColor,
  } satisfies ParticleKind,
} satisfies Record<string, ParticleKind>;

export type KindName = keyof typeof KINDS;

export type Emission = {
  readonly kinds: readonly KindName[];
  readonly every: number;
  readonly count?: number;
  readonly light?:
    | readonly [number, number, number]
    | (() => readonly [number, number, number]);
  readonly scale?: number;
  readonly jitter?: number;
};

/**
 * Emissions for an object type on a world — `MapLayer.emissions` on each map
 * entry (`src/maps/<name>/spec.ts`), read through the facade.
 */
export function emissionsFor(
  world: number,
  type: number
): readonly Emission[] | undefined {
  return maps.emissionsFor(world, type);
}

type Pool = {
  manager: SpriteManager;
  pixelSize: number;
  frames: number;
  free: Sprite[];
};

let scene: Scene | null = null;
const pools = new Map<string, Pool>();
const loading = new Map<string, Promise<Pool | null>>();
const particles: Particle[] = [];
let worldTimeMs = 0;
let tickObserver: unknown = null;

const poolKey = (texture: TextureKey, blend: Blend) => `${texture}:${blend}`;

async function getPool(
  target: Scene,
  texture: TextureKey,
  blend: Blend
): Promise<Pool | null> {
  const key = poolKey(texture, blend);

  const existing = pools.get(key);
  if (existing) return existing;

  let inFlight = loading.get(key);

  if (!inFlight) {
    inFlight = (async () => {
      const { file, size } = TEXTURES[texture];

      // A sheet this version never shipped: no pool, no particles, and no
      // fetch per emission for the rest of the session (`hasDataFile`).
      if (!hasDataFile(file)) return null;

      const ozj = await downloadDataFile(file);

      const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], {
        type: 'image/jpeg',
      });

      const manager = new SpriteManager(
        `effectParticles_${key}`,
        URL.createObjectURL(blob),
        POOL_SIZE,
        { width: size, height: size },
        target
      );

      manager.blendMode =
        blend === 'add' ? Constants.ALPHA_ONEONE : Constants.ALPHA_SUBTRACT;

      manager.disableDepthWrite = true;
      manager.isPickable = false;

      const pool: Pool = {
        manager,
        pixelSize: size,
        frames: TEXTURES[texture].frames ?? 1,
        free: [],
      };
      pools.set(key, pool);

      return pool;
    })();

    loading.set(key, inFlight);
  }

  return inFlight;
}

function acquire(pool: Pool): Sprite | null {
  const reused = pool.free.pop();

  if (reused) {
    reused.isVisible = true;
    return reused;
  }

  if (pool.manager.sprites.length >= POOL_SIZE) return null;

  const sprite = new Sprite('particle', pool.manager);
  sprite.isPickable = false;

  return sprite;
}

function ensureTicking(target: Scene) {
  if (tickObserver && scene === target) return;

  scene = target;

  tickObserver = target.onBeforeRenderObservable.add(() => {
    const deltaMs = target.getEngine().getDeltaTime();
    worldTimeMs += deltaMs;

    const f = Math.min(1, (deltaMs / 1000) * TICKS_PER_SECOND);

    const color = new Color4(1, 1, 1, 1);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.lifeTime -= f;
      if (p.lifeTime <= 0) p.live = false;

      if (p.live) {
        if (p.vx !== 0 || p.vy !== 0 || p.vz !== 0) {
          const c = Math.cos(p.angleZ);
          const s = Math.sin(p.angleZ);

          p.px += (p.vx * c - p.vy * s) * f;
          p.py += (p.vx * s + p.vy * c) * f;
          p.pz += p.vz * f;
        }

        p.kind.update(p, f, worldTimeMs);
      }

      if (!p.live || p.scale <= 0) {
        release(p);
        particles.splice(i, 1);
        continue;
      }

      const sprite = p.sprite;

      sprite.position.set(
        p.px / TILE_CM,
        p.pz / TILE_CM,
        p.py / TILE_CM
      );

      const size = (p.pixelSize * p.scale) / TILE_CM;
      sprite.width = size;
      sprite.height = size;
      sprite.angle = (p.rotation * Math.PI) / 180;

      if (p.frames > 1) {
        sprite.cellIndex = ((p.frame % p.frames) + p.frames) % p.frames;
      }

      p.kind.color(p, color);
      sprite.color.copyFrom(color);
    }
  });
}

const releasePools = new Map<Sprite, Pool>();

function release(p: Particle) {
  p.sprite.isVisible = false;

  const pool = releasePools.get(p.sprite);
  if (pool) pool.free.push(p.sprite);
}

export async function spawnParticle(
  target: Scene,
  kindName: KindName,
  position: { x: number; y: number; z: number },
  angleZ: number,
  scale: number,
  light: readonly [number, number, number],
  jitter = 0
): Promise<void> {
  const kind = KINDS[kindName] as ParticleKind;

  const pool = await getPool(target, kind.texture, kind.blend);
  if (!pool) return;

  const sprite = acquire(pool);
  if (!sprite) return;

  releasePools.set(sprite, pool);
  ensureTicking(target);

  const p: Particle = {
    live: true,
    kind,
    sprite,
    pixelSize: pool.pixelSize,
    frame: 0,
    frames: pool.frames,
    lifeTime: 2,
    scale,
    alpha: 1,
    gravity: 0,
    rotation: 0,
    px: position.x * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    py: position.z * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    pz: position.y * TILE_CM + (jitter ? rand(jitter * 2) - jitter : 0),
    vx: 0,
    vy: 0,
    vz: 0,
    angleZ,
    lr: light[0],
    lg: light[1],
    lb: light[2],
    tr: light[0],
    tg: light[1],
    tb: light[2],
  };

  kind.init(p, scale, light);

  particles.push(p);
}

export class ParticleEmitter {
  #due: number[];

  constructor(
    private readonly target: Scene,
    private readonly emissions: readonly Emission[],
    private readonly position: { x: number; y: number; z: number },
    private readonly angleZ: number,
    private readonly scale: number
  ) {
    this.#due = emissions.map(() => 0);
  }

  update(): void {
    const deltaSeconds = this.target.getEngine().getDeltaTime() / 1000;

    for (let i = 0; i < this.emissions.length; i++) {
      const emission = this.emissions[i];

      this.#due[i] += (deltaSeconds * TICKS_PER_SECOND) / emission.every;

      if (this.#due[i] > 4) this.#due[i] = 4;

      while (this.#due[i] >= 1) {
        this.#due[i] -= 1;

        const count = emission.count ?? 1;

        for (let n = 0; n < count; n++) {
          const kind =
            emission.kinds[Math.floor(Math.random() * emission.kinds.length)];

          const light =
            typeof emission.light === 'function'
              ? emission.light()
              : (emission.light ?? WHITE);

          void spawnParticle(
            this.target,
            kind,
            this.position,
            this.angleZ,
            this.scale * (emission.scale ?? 1),
            light,
            emission.jitter
          );
        }
      }
    }
  }
}

export type BonedEmission = {
  readonly node: { getAbsolutePosition(): { x: number; y: number; z: number } };
  readonly kinds: readonly KindName[];
  readonly count: number;
  /** Constant size, or one sampled per spawn (wing auras pulse with WorldTime). */
  readonly scale: number | (() => number);
  readonly light: readonly [number, number, number] | (() => readonly [number, number, number]);
  readonly offsetY?: number;
  /** Spawn only every n-th 25 Hz tick (default 1 = every tick). */
  readonly every?: number;
};

export class BonedParticleEmitter {
  #due = 0;
  #tick = 0;

  constructor(
    private readonly target: Scene,
    private readonly points: readonly BonedEmission[]
  ) {}

  update(): void {
    this.#due += (this.target.getEngine().getDeltaTime() / 1000) * TICKS_PER_SECOND;

    if (this.#due > 4) this.#due = 4;

    while (this.#due >= 1) {
      this.#due -= 1;
      this.#tick++;

      for (const point of this.points) {
        if (point.every && point.every > 1 && this.#tick % point.every !== 0) {
          continue;
        }

        const base = point.node.getAbsolutePosition();
        const position = point.offsetY
          ? { x: base.x, y: base.y + point.offsetY, z: base.z }
          : base;

        const scale =
          typeof point.scale === 'function' ? point.scale() : point.scale;
        const light =
          typeof point.light === 'function' ? point.light() : point.light;

        for (let n = 0; n < point.count; n++) {
          const kind =
            point.kinds[Math.floor(Math.random() * point.kinds.length)];

          void spawnParticle(this.target, kind, position, 0, scale, light);
        }
      }
    }
  }
}

export function disposeEffectParticles(): void {
  for (const p of particles) p.sprite.dispose();
  particles.length = 0;
  releasePools.clear();

  for (const pool of pools.values()) pool.manager.dispose();
  pools.clear();
  loading.clear();

  if (tickObserver && scene) {
    scene.onBeforeRenderObservable.remove(tickObserver as never);
  }

  tickObserver = null;
  scene = null;
}
