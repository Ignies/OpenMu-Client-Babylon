import { TILE_CM } from '../terrain/consts';
import {
  Color4,
  Sprite,
  SpriteManager,
  Constants,
  type Scene,
} from '../render/babylon/exports';
import { downloadDataFile } from '@/controllers/assets/mu';
import { lookDirector, type LookDirector } from './director';
import { EFFECT_RENDERING_GROUP, keepDepthForEffects } from '../fx/core';

/**
 * Flare cards: the additive sprite the original draws over a flame, from
 * the sheet it names (`FLARE_TEXTURES`). Purely visual - a flare lights
 * nothing. The light a flame throws is the lighting layer's
 * (`controllers/lighting/mapObjectLights.ts`), whose `LightEmitter.sprite` block is
 * the `FlareSpec` a host hands to `createEffectLight`.
 *
 * A flare is the glow of a light, so it sits at the map's level: its colour
 * is `spec x luminosity x flareLevel`, repainted
 * when the director's state changes. The decode to linear is the sprite
 * shader's (controllers/render/babylon/spriteLinear.ts), as it is for any material.
 *
 * One `SpriteManager` per sheet and scene, shared by every flare on the map.
 */

/**
 * The sheets, by the bitmap the original names (ZzzOpenData.cpp): `light` is BITMAP_LIGHT,
 * flare01.jpg, a soft white glow (:5207); `flare` BITMAP_FLARE, Flare.jpg, a warm star (:5309);
 * `spark1` BITMAP_SPARK + 1, Spark03.jpg, a white dot in a blue halo (:5216); `shiny5`
 * BITMAP_SHINY + 5, shiny05.jpg, an eight-point sparkle (:5325 loads it over :5279's shiny04.jpg,
 * and a second name replaces the first, GlobalBitmap.cpp:549-568); `impact` BITMAP_IMPACT,
 * Impack03.jpg, a blue-white burst (:5267; Tarkan reloads the same file from Object9,
 * MapManager.cpp:146); `magic1` BITMAP_MAGIC + 1, Magic_Ground2.jpg, a ring of rays (:5209);
 * `lightning1` BITMAP_LIGHTNING + 1, lightning2.jpg, a cyan burst (:5295); `kanturu2ndEffect1`
 * BITMAP_KANTURU_2ND_EFFECT1, Object39's k_effect_01.jpg, a white star (:5495). `px` is the
 * sheet's width: a sprite is `Width * Scale` across (zzzeffectsprite.cpp:76). `sprites` caps a busy
 * sheet higher: Aida's 183 plants carry twelve sparks each.
 */
const FLARE_TEXTURES = {
  light: { file: 'Effect/flare01.OZJ', px: 64 },
  flare: { file: 'Effect/Flare.OZJ', px: 64 },
  spark1: { file: 'Effect/Spark03.OZJ', px: 32, sprites: 2560 },
  shiny5: { file: 'Effect/shiny05.OZJ', px: 64 },
  impact: { file: 'Effect/Impack03.OZJ', px: 64 },
  magic1: { file: 'Effect/Magic_Ground2.OZJ', px: 128 },
  lightning1: { file: 'Effect/lightning2.OZJ', px: 128 },
  kanturu2ndEffect1: { file: 'Object39/k_effect_01.OZJ', px: 64 },
} as const;

export type FlareTexture = keyof typeof FLARE_TEXTURES;

const OZJ_HEADER_SIZE = 24;

const MAX_SPRITES_PER_MANAGER = 512;

/**
 * `(sin(ms * speed) + 1) * amount + base`, the original's `sinf(WorldTime * k)` shapes; `abs` folds
 * it up at zero instead, `|sin| * amount + base` (`absf(sinf(...))`, GMKarutan1.cpp:88).
 */
type Wave = { speed: number; amount: number; base: number; abs?: boolean };

const wave = (w: Wave, ms: number) => {
  const s = Math.sin(ms * w.speed);

  return (w.abs ? Math.abs(s) : s + 1) * w.amount + w.base;
};

/** A card as a map's light table names it (`LightEmitter.sprite`). */
export type FlareSpec = {
  readonly scale: number;
  readonly color: readonly [number, number, number];
  /** Its brightness over time. */
  readonly pulse?: Wave;
  /** Its size over time: `CreateSprite(..., Luminosity * 7.0f, ...)`. */
  readonly grow?: Wave;
  /** Degrees a millisecond it turns, counter-clockwise: `CreateSprite`'s `Rotation` (ZzzOpenglUtil.cpp:899-908). */
  readonly spin?: number;
  /** The sheet the original names; `BITMAP_LIGHT` when left out. */
  readonly texture?: FlareTexture;
  /** The original sizes it without `* o->Scale` (`CreateSprite(..., 5.5f, ...)`): the object's scale does not apply. */
  readonly unscaled?: boolean;
};

const RADIANS_PER_DEGREE = Math.PI / 180;

/** A card's width in tiles: the sheet's pixels times its scale. */
const cardSize = (texture: FlareTexture, scale: number) => (FLARE_TEXTURES[texture].px * scale) / TILE_CM;

/** A sheet's manager for the scene it was built in, once it has loaded. */
type Sheet = {
  scene: Scene;
  manager: SpriteManager | null;
  pending: Promise<SpriteManager | null>;
};

const sheets = new Map<FlareTexture, Sheet>();

/** Every live flare's repaint, run when the director publishes a new state. */
const repaints = new Set<() => void>();
let watched: LookDirector | null = null;

/**
 * The level a flare is painted at. Outdoors and on Classic that is the map's
 * own; inside a room it is the room's share of it, the same share the rig and
 * the ground bake take (lighting_polish §13 F14). Without the share the flare
 * runs at roughly four times the light of everything around it and saturates
 * to a white ball with the candle bodies invisible inside it.
 */
function flareLevel(): number {
  const look = lookDirector()?.state();

  return look ? look.keyGain * look.key.roomShare : 1;
}

function watchLook(): void {
  const director = lookDirector();
  if (!director || director === watched) return;
  watched = director;
  director.onChange.add(() => {
    for (const repaint of repaints) repaint();
  });
}

function getManager(scene: Scene, texture: FlareTexture): Promise<SpriteManager | null> {
  // Only a sheet built for another scene is stale. One still loading for
  // this scene is shared: a fresh one per caller made seven empty
  // 'effectLights' managers per map load.
  const current = sheets.get(texture);
  if (current?.scene === scene) return current.pending;

  const sheet: Sheet = { scene, manager: null, pending: Promise.resolve(null) };
  sheet.pending = (async () => {
    const source: { file: string; px: number; sprites?: number } = FLARE_TEXTURES[texture];
    const ozj = await downloadDataFile(source.file);

    const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const created = new SpriteManager(
      'effectLights',
      url,
      source.sprites ?? MAX_SPRITES_PER_MANAGER,
      { width: source.px, height: source.px },
      scene
    );

    created.blendMode = Constants.ALPHA_ONEONE;

    created.disableDepthWrite = true;

    created.isPickable = false;

    // After the alpha-keyed meshes, which write depth in the transparent
    // queue: a flare drawn before them was painted over by the hearth behind it.
    created.renderingGroupId = EFFECT_RENDERING_GROUP;
    keepDepthForEffects(scene);

    sheet.manager = created;

    return created;
  })();
  sheets.set(texture, sheet);

  return sheet.pending;
}

/** The sheet's manager, unless another scene replaced it while it loaded. */
async function liveManager(scene: Scene, texture: FlareTexture): Promise<SpriteManager | null> {
  const spriteManager = await getManager(scene, texture);

  return spriteManager && sheets.get(texture)?.manager === spriteManager ? spriteManager : null;
}

export type EffectLight = {
  dispose(): void;
};

export type MovableFlare = {
  moveTo(x: number, y: number, z: number): void;
  setLuminosity(lumi: number): void;
  /** Resizes it: a sprite the original sizes by its `Luminosity`. */
  setScale(scale: number): void;
  /** Turns it on the screen, counter-clockwise: `CreateSprite`'s `Rotation` (ZzzOpenglUtil.cpp:899-908). */
  setAngle(degrees: number): void;
  dispose(): void;
};

/**
 * Paints `color x lumi x flareLevel` and keeps repainting it while the flare
 * lives. Display-referred tints (the original's `Luminosity x (r, g, b)`
 * vectors) at the map's level; the sprite shader decodes the product on the
 * graded tiers, so the texel's soft skirt goes linear with the colour rather
 * than the colour alone (which lifted the skirt into a pale disc once the tone
 * pass took the art back to display space).
 */
function paintFlare(
  sprite: Sprite,
  color: readonly [number, number, number]
): { setLuminosity(lumi: number): void; release(): void } {
  const [r, g, b] = color;
  let lumi = 1;
  const repaint = () => {
    const level = flareLevel();
    const c = (v: number) => v * lumi * level;
    sprite.color.set(c(r), c(g), c(b), 1);
  };
  sprite.color = new Color4(r, g, b, 1);
  repaint();
  repaints.add(repaint);
  watchLook();

  return {
    setLuminosity(next) {
      lumi = next;
      repaint();
    },
    release() {
      repaints.delete(repaint);
    },
  };
}

export async function createMovableFlare(
  scene: Scene,
  scale: number,
  color: readonly [number, number, number],
  texture: FlareTexture = 'light'
): Promise<MovableFlare | null> {
  const spriteManager = await liveManager(scene, texture);

  if (!spriteManager) return null;

  const sprite = new Sprite('candleFlare', spriteManager);

  sprite.isPickable = false;

  const size = cardSize(texture, scale);

  sprite.width = size;
  sprite.height = size;

  const paint = paintFlare(sprite, color);

  return {
    moveTo: (x, y, z) => sprite.position.set(x, y, z),
    setLuminosity: lumi => paint.setLuminosity(lumi),
    setScale: next => void (sprite.width = sprite.height = cardSize(texture, next)),
    setAngle: degrees => void (sprite.angle = degrees * RADIANS_PER_DEGREE),
    dispose: () => {
      paint.release();
      sprite.dispose();
    },
  };
}

/** A fixed flare at `position`, sized by the object's own scale. */
export async function createEffectLight(
  scene: Scene,
  spec: FlareSpec,
  position: { x: number; y: number; z: number },
  objectScale: number
): Promise<EffectLight | null> {
  const texture = spec.texture ?? 'light';
  const spriteManager = await liveManager(scene, texture);

  if (!spriteManager) return null;

  const sprite = new Sprite('effectLight', spriteManager);

  sprite.position.set(position.x, position.y, position.z);
  sprite.isPickable = false;

  const size = cardSize(texture, spec.scale * (spec.unscaled ? 1 : objectScale));
  sprite.width = size;
  sprite.height = size;

  const paint = paintFlare(sprite, spec.color);

  let observer: ReturnType<Scene['onBeforeRenderObservable']['add']> | null =
    null;

  const { pulse, grow, spin } = spec;

  if (pulse || grow || spin) {
    let elapsed = 0;

    observer = scene.onBeforeRenderObservable.add(() => {
      elapsed += scene.getEngine().getDeltaTime();

      if (pulse) paint.setLuminosity(wave(pulse, elapsed));
      if (grow) sprite.width = sprite.height = size * wave(grow, elapsed);
      if (spin) sprite.angle = elapsed * spin * RADIANS_PER_DEGREE;
    });
  }

  return {
    dispose: () => {
      if (observer) scene.onBeforeRenderObservable.remove(observer);
      paint.release();
      sprite.dispose();
    },
  };
}
