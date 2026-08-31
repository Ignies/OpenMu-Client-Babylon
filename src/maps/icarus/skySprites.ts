import { TILE_CM } from '../../common/terrain/consts';
import {
  Constants,
  Sprite,
  SpriteManager,
  type Scene,
} from '../../libs/babylon/exports';
import { downloadDataFile } from '../../libs/mu/dataFolder';

/** OZJ is a 24-byte header in front of a plain JPEG (see `effectLights.ts`). */
const OZJ_HEADER_SIZE = 24;

/** MU units per world unit — the whole client divides positions by this. */

export type SkySpriteTexture = {
  readonly file: string;
  readonly size: number;
  readonly capacity: number;
};

/**
 * `BITMAP_CLOUD`, the texture behind every cloud on the map. 256², so a
 * particle at the original's 1.80…1.99 scale draws ~4.9 tiles across.
 *
 * The capacity is a budget, not the reference's count. EncTerrain11.obj holds
 * 335 cloud emitters (16+21+8 of types 0-2 at 20 clouds each, 115+61+114 of
 * types 3-5 at 10 each) — 3800 billboards if every one were in view at once.
 * The visibility radius keeps most of them unbuilt, and `IcarusCloudField`
 * spawns what it can get and lives with a thinner bank when the pool is full,
 * so the first emitters built (which are the ones nearest the hero, since
 * `ModelLoaderSystem` builds on the visibility transition) get their full
 * count.
 */
export const CLOUD_TEXTURE: SkySpriteTexture = {
  file: 'Effect/clouds.OZJ',
  size: 256,
  capacity: 1200,
};

/**
 * `BITMAP_CLOUD + 1` — `Effect/cloudLight.OZJ`, also 256². The glow
 * `MoveObjectOnEffect` (ZzzObject.cpp:4338) hangs off a cloud object one frame
 * in ten. Far fewer live at once than clouds: ~2.5 spawns a second per visible
 * emitter, each lasting well under a second.
 */
export const CLOUD_LIGHT_TEXTURE: SkySpriteTexture = {
  file: 'Effect/cloudLight.OZJ',
  size: 256,
  capacity: 256,
};

/**
 * A fixed-capacity billboard pool over one OZJ texture.
 *
 * `effectParticles.ts` already pools sprites, and the clouds do not use it for
 * two reasons that both come down to the shape of `ParticleKind`: its blend
 * modes are `add` / `subtract` only, and its update contract owns the
 * particle's motion. See `ICARUS_EMISSIONS` in spec.ts for the long form.
 *
 * Managers are cached per scene and are *not* disposed when the map unloads,
 * matching `effectLights.ts` and `effectParticles.ts` — the sprites are hidden
 * and returned to the free list instead, so a return trip to Icarus reuses the
 * decoded texture rather than downloading and uploading it again.
 */
export class SkySpritePool {
  #free: Sprite[] = [];

  #alive = true;

  private constructor(
    readonly manager: SpriteManager,
    readonly pixelSize: number,
    readonly capacity: number
  ) {}

  static build(
    scene: Scene,
    texture: SkySpriteTexture,
    jpeg: Uint8Array
  ): SkySpritePool {
    const blob = new Blob([jpeg], { type: 'image/jpeg' });

    const manager = new SpriteManager(
      `icarusSky_${texture.file}`,
      URL.createObjectURL(blob),
      texture.capacity,
      { width: texture.size, height: texture.size },
      scene
    );

    // Every sky billboard in this world is a glow over a dark navy void, and
    // the source is a JPEG with no alpha channel: `ALPHA_COMBINE` would draw
    // the texture's black surround as opaque black squares. The original's
    // clouds are dim (`Light` = 0.1 flat) precisely because they are meant to
    // accumulate, which is what one-one does.
    manager.blendMode = Constants.ALPHA_ONEONE;
    manager.disableDepthWrite = true;
    manager.isPickable = false;

    return new SkySpritePool(manager, texture.size, texture.capacity);
  }

  /** A hidden sprite from the free list, a new one, or null when full. */
  acquire(): Sprite | null {
    if (!this.#alive) return null;

    const reused = this.#free.pop();

    if (reused) {
      reused.isVisible = true;
      return reused;
    }

    if (this.manager.sprites.length >= this.capacity) return null;

    const sprite = new Sprite('icarusSky', this.manager);
    sprite.isPickable = false;

    return sprite;
  }

  release(sprite: Sprite): void {
    if (!this.#alive) return;

    sprite.isVisible = false;
    this.#free.push(sprite);
  }

  /** World size of a sprite drawn at `scale`, in tiles. */
  sizeFor(scale: number): number {
    return (this.pixelSize * scale) / TILE_CM;
  }

  dispose(): void {
    this.#alive = false;
    this.#free.length = 0;
    this.manager.dispose();
  }
}

const pools = new Map<string, SkySpritePool>();
const loading = new Map<string, Promise<SkySpritePool | null>>();

let poolScene: Scene | null = null;

/**
 * The pool for a texture, building it on first use. Concurrent callers (every
 * cloud emitter on the map asks at once during a load) share one download.
 */
export function getSkySpritePool(
  scene: Scene,
  texture: SkySpriteTexture
): Promise<SkySpritePool | null> {
  // A new scene means the cached managers belong to a disposed one.
  if (poolScene !== scene) {
    poolScene = scene;
    pools.clear();
    loading.clear();
  }

  const key = texture.file;

  const existing = pools.get(key);
  if (existing) return Promise.resolve(existing);

  let inFlight = loading.get(key);

  if (!inFlight) {
    inFlight = downloadDataFile(texture.file)
      .then(ozj => {
        // The scene may have changed while the download was in flight.
        if (poolScene !== scene) return null;

        const pool = SkySpritePool.build(
          scene,
          texture,
          ozj.slice(OZJ_HEADER_SIZE)
        );

        pools.set(key, pool);

        return pool;
      })
      .catch(() => null);

    loading.set(key, inFlight);
  }

  return inFlight;
}
