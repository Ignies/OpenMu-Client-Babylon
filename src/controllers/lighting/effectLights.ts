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
 * The sheets: `BITMAP_LIGHT` is flare01.jpg, a soft white glow (ZzzOpenData.cpp:5207);
 * `BITMAP_FLARE` is Flare.jpg, a warm star (:5309). Both 64 x 64.
 */
const FLARE_TEXTURES = {
  light: 'Effect/flare01.OZJ',
  flare: 'Effect/Flare.OZJ',
} as const;

export type FlareTexture = keyof typeof FLARE_TEXTURES;

const OZJ_HEADER_SIZE = 24;

const FLARE_SIZE_PX = 64;

const MAX_SPRITES_PER_MANAGER = 512;

type FlareSpec = {
  readonly scale: number;
  readonly color: readonly [number, number, number];
  readonly pulse?: { speed: number; amount: number; base: number };
  /** The sheet the original names; `BITMAP_LIGHT` when left out. */
  readonly texture?: FlareTexture;
};

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
    const ozj = await downloadDataFile(FLARE_TEXTURES[texture]);

    const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const created = new SpriteManager(
      'effectLights',
      url,
      MAX_SPRITES_PER_MANAGER,
      { width: FLARE_SIZE_PX, height: FLARE_SIZE_PX },
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

  const size = (FLARE_SIZE_PX * scale) / TILE_CM;

  sprite.width = size;
  sprite.height = size;

  const paint = paintFlare(sprite, color);

  return {
    moveTo: (x, y, z) => sprite.position.set(x, y, z),
    setLuminosity: lumi => paint.setLuminosity(lumi),
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
  const spriteManager = await liveManager(scene, spec.texture ?? 'light');

  if (!spriteManager) return null;

  const sprite = new Sprite('effectLight', spriteManager);

  sprite.position.set(position.x, position.y, position.z);
  sprite.isPickable = false;

  const size = (FLARE_SIZE_PX * spec.scale * objectScale) / TILE_CM;
  sprite.width = size;
  sprite.height = size;

  const paint = paintFlare(sprite, spec.color);

  let observer: ReturnType<Scene['onBeforeRenderObservable']['add']> | null =
    null;

  if (spec.pulse) {
    const { speed, amount, base } = spec.pulse;

    let elapsed = 0;

    observer = scene.onBeforeRenderObservable.add(() => {
      elapsed += scene.getEngine().getDeltaTime();

      paint.setLuminosity((Math.sin(elapsed * speed) + 1) * amount + base);
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
