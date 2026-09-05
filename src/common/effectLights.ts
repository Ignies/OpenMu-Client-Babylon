import { TILE_CM } from './terrain/consts';
import {
  Color4,
  Sprite,
  SpriteManager,
  Constants,
  type Scene,
} from '../libs/babylon/exports';
import { downloadDataFile } from '../libs/mu/dataFolder';
import { lookDirector, type LookDirector } from '../lighting/director';
import { EFFECT_RENDERING_GROUP, keepDepthForEffects } from '../effects/core';

/**
 * Flare cards: the additive `flare01` sprite the original draws over a
 * flame (`BITMAP_LIGHT` / `BITMAP_FLARE`). Purely visual — a flare lights
 * nothing. The light a flame throws is the lighting layer's
 * (`src/lighting/mapObjectLights.ts`), whose `LightEmitter.sprite` block is
 * the `FlareSpec` a host hands to `createEffectLight`.
 *
 * A flare is the glow of a light, so it sits at the map's level: its colour
 * is `spec x luminosity x keyGain` (ARCHITECTURE F12), repainted when the
 * director's state changes. Sprites are not decoded on their way into the
 * buffer, so the gain is applied as is.
 *
 * One `SpriteManager` per scene, shared by every flare on the map.
 */

const FLARE_TEXTURE = 'Effect/flare01.OZJ';

const OZJ_HEADER_SIZE = 24;

const FLARE_SIZE_PX = 64;


const MAX_SPRITES_PER_MANAGER = 512;

export type FlareSpec = {
  readonly scale: number;
  readonly color: readonly [number, number, number];
  readonly pulse?: { speed: number; amount: number; base: number };
};

let manager: SpriteManager | null = null;
let managerScene: Scene | null = null;
let pending: Promise<SpriteManager | null> | null = null;

/** Every live flare's repaint, run when the director publishes a new state. */
const repaints = new Set<() => void>();
let watched: LookDirector | null = null;

function keyGain(): number {
  return lookDirector()?.state().keyGain ?? 1;
}

function watchLook(): void {
  const director = lookDirector();
  if (!director || director === watched) return;
  watched = director;
  director.onChange.add(() => {
    for (const repaint of repaints) repaint();
  });
}

async function getManager(scene: Scene): Promise<SpriteManager | null> {
  if (manager && managerScene === scene) return manager;

  // Only a manager built for another scene is stale. While the first
  // request is still in flight `manager` is null too, and resetting
  // `pending` there made every concurrent caller build its own manager
  // (seven empty 'effectLights' managers per map load).
  if (manager && managerScene !== scene) {
    pending = null;
    manager = null;
  }

  pending ??= (async () => {
    const ozj = await downloadDataFile(FLARE_TEXTURE);

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

    manager = created;
    managerScene = scene;

    return created;
  })();

  return pending;
}

export function disposeEffectLights(): void {
  manager?.dispose();
  manager = null;
  managerScene = null;
  pending = null;
  repaints.clear();
}

export type EffectLight = {
  dispose(): void;
};

export type MovableFlare = {
  moveTo(x: number, y: number, z: number): void;
  setLuminosity(lumi: number): void;
  dispose(): void;
};

/** Paints `color x lumi x keyGain` and keeps repainting it while the flare lives. */
function paintFlare(
  sprite: Sprite,
  color: readonly [number, number, number]
): { setLuminosity(lumi: number): void; release(): void } {
  const [r, g, b] = color;
  let lumi = 1;
  const repaint = () => {
    const k = lumi * keyGain();
    sprite.color.set(r * k, g * k, b * k, 1);
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
  color: readonly [number, number, number]
): Promise<MovableFlare | null> {
  const spriteManager = await getManager(scene);

  if (!spriteManager || manager !== spriteManager) return null;

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
  const spriteManager = await getManager(scene);

  if (!spriteManager || manager !== spriteManager) return null;

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
