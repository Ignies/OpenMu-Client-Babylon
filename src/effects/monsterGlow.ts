/**
 * Monster glow — the additive cards a monster carries on its own bones for as
 * long as it is in scope: Bahamut's anglerfish lure, the light in each of
 * Vepar's hands, the Lost Tower Shadow's whole luminous body.
 *
 * The original draws these from `RenderCharacter` every frame
 * (ZzzCharacter.cpp:11005-11036, :11099-11132) through `RenderLight` (:8243):
 * one `CreateSprite` on a skinned bone, warm amber, breathing
 * `sinf(WorldTime * 0.002f) * 0.3f + 0.7f`. `CreateSprite` sizes a card in
 * texture pixels x `Scale` and the world is centimetres
 * (zzzeffectsprite.cpp:73), which is the `px * scale / TILE_CM` below.
 *
 * Drawn as `SpriteManager` sprites rather than `core.ts` cards for one
 * reason: the Shadow is 39 cards on its own, and Lost Tower spawns them in
 * packs. One manager per texture batches every glow on the map into one draw
 * call each.
 *
 * Driven by: `ecs/systems/monsterGlowSystem.ts`. Read by: nobody. The light
 * these throw on the floor is the lighting layer's
 * (`lighting/characters.ts`), which carries the matching rows.
 */
import {
  Color4,
  Constants,
  Sprite,
  SpriteManager,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import { TILE_CM } from '../common/terrain/consts';
import { downloadDataFile } from '../libs/mu/dataFolder';
import type { Entity } from '../ecs/world';
import { boneLocalPos, entityGone } from './core';
import { TEX } from './recipes';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** OZJ files open with a 24-byte header before the JPEG (`effectLights.ts`). */
const OZJ_HEADER_SIZE = 24;

/** Sprites one manager holds. A Shadow takes 39; a map full of them fits. */
const MAX_SPRITES_PER_MANAGER = 1024;

/** `RenderLight`'s breathing, in radians per second (`WorldTime` is ms). */
const BREATH_SPEED = 0.002 * 1000;

/** ...and its shape: `sin(t) * 0.3 + 0.7`, so 0.4 at the trough. */
const BREATH_AMOUNT = 0.3;
const BREATH_BASE = 0.7;

/** `RenderLight`'s colour before the breath: `(L, 0.6L, 0.4L)` (:8250). */
const RENDER_LIGHT_RGB = [1, 0.6, 0.4] as const;

/**
 * The textures a glow is drawn with, with the pixel size `CreateSprite`
 * multiplies by `Scale`. Shiny03 is the 8:1 flare bar, Spark02 the 4x4
 * pinpoint that sits in its middle.
 */
const GLOW_TEXTURES = {
  /** BITMAP_SPARK (Spark02): the hot core. */
  core: { file: TEX.spark2, px: [4, 4] },
  /** BITMAP_SHINY+2 (Shiny03): the wide, thin flare bar. */
  bar: { file: TEX.shiny3, px: [128, 16] },
  /** BITMAP_LIGHTNING+1 (lightning2): the ragged halo around a held light. */
  halo: { file: TEX.lightning2, px: [128, 128] },
  /** BITMAP_SHINY+1 (Shiny02): the Shadow's body wisp. */
  wisp: { file: TEX.shiny2, px: [32, 64] },
  /** BITMAP_MAGIC+1 (Magic_Ground2): Poison Shadow's body haze. */
  haze: { file: TEX.magicGround2, px: [128, 128] },
  /** BITMAP_LIGHT (flare01): the plain round glow. */
  flare: { file: TEX.flare, px: [64, 64] },
} as const;

type GlowTexture = keyof typeof GLOW_TEXTURES;

/**
 * `CreateSprite`'s `SubType` picks the blend (zzzeffectsprite.cpp:151-166):
 * 0 is `EnableAlphaBlend`, `(ONE, ONE)`; 1 is `EnableAlphaBlendMinus`,
 * `(ZERO, ONE_MINUS_SRC_COLOR)` — `dst * (1 - src)`, which is Babylon's
 * `ALPHA_SUBTRACT` exactly. The Shadow is the one glow drawn that way, and
 * that is the whole monster: it takes light out of the frame.
 */
type GlowBlend = 'add' | 'subtract';

/** One `CreateSprite` call: which sheet, at which `Scale`, blended how. */
type GlowCard = {
  readonly tex: GlowTexture;
  readonly scale: number;
  readonly blend?: GlowBlend;
};

export type MonsterGlow = {
  /**
   * MU bone indices the cards hang on, or `'body'` for the Shadow's "every
   * bone that is not a dummy" walk.
   */
  readonly bones: readonly number[] | 'body';
  /** Bone ranges `'body'` leaves out, inclusive (:11109-11112). */
  readonly skip?: readonly (readonly [number, number])[];
  /** Offset in the bone's own frame, tiles (the original's `x, y, z` / 100). */
  readonly local?: readonly [number, number, number];
  readonly cards: readonly GlowCard[];
  /** Peak colour. Defaults to `RenderLight`'s amber. */
  readonly colour?: readonly [number, number, number];
  /** `RenderLight` breathes; the hand-written cases hold a fixed luminosity. */
  readonly breathe?: boolean;
  /** Fixed luminosity when `breathe` is false (the case's `Luminosity`). */
  readonly luminosity?: number;
};

/** `RenderLight(o, tex, scale, bone, x, y, z)` for one or more bones. */
function renderLight(
  bones: readonly number[],
  cards: readonly GlowCard[],
  local?: readonly [number, number, number]
): MonsterGlow {
  return { bones, cards, local, breathe: true };
}

/**
 * Keyed by NPC/monster type number (`MonstersDatabase`). Every row is a
 * transcription; the file:line is the original's site.
 */
export const MONSTER_GLOWS: Partial<Record<number, MonsterGlow>> = {
  // 45 Bahamut / 51 Great Bahamut (MODEL_BAHAMUT): the lure on bone 9, :11028.
  45: renderLight([9], [{ tex: 'core', scale: 4 }, { tex: 'bar', scale: 3 }], [0, 0, 0.05]),
  // 46 Vepar / 80 Golden Vepar (MODEL_VEPAR): one in each hand, :11009.
  46: renderLight(
    [30, 39],
    [
      { tex: 'halo', scale: 0.5 },
      { tex: 'core', scale: 4 },
      { tex: 'bar', scale: 2 },
    ],
    [0, 0, -0.05]
  ),
  // 48 Lizard King / 81 Golden Lizard King (MODEL_LIZARD): four spikes, :11017.
  48: renderLight([26, 31, 36, 41], [{ tex: 'core', scale: 2 }, { tex: 'bar', scale: 1 }]),
  // 49 Hydra (MODEL_HYDRA): one big flare over the head, :11005.
  49: renderLight([63], [{ tex: 'halo', scale: 1 }, { tex: 'bar', scale: 4 }], [0, 0, 0.2]),
  // 36 Shadow (MODEL_SHADOW, `c->Level == 0`): `SubType 1`, so the body is
  // drawn *out* of the frame rather than into it — the name is literal
  // (:11123). The skipped bones are the floating Box01-14 shards, which stay
  // solid. :11099-11132.
  36: {
    bones: 'body',
    skip: [
      [15, 20],
      [27, 32],
    ],
    cards: [{ tex: 'wisp', scale: 2.5, blend: 'subtract' }],
    colour: [1, 1, 1],
    breathe: false,
    luminosity: 1,
  },
  // 39 Poison Shadow (MODEL_SHADOW, `c->Level == 1`): the same body, green.
  39: {
    bones: 'body',
    skip: [
      [15, 20],
      [27, 32],
    ],
    cards: [{ tex: 'haze', scale: 0.8 }],
    colour: [0.2, 0.7, 0.1],
    breathe: false,
    luminosity: 1,
  },
  // 27 Scorpion (MODEL_CHAIN_SCORPION): the tail lamp, `Luminosity` 0.8 flat
  // (ZzzCharacter.cpp:6032-6039).
  27: {
    bones: [7],
    cards: [{ tex: 'flare', scale: 1 }],
    colour: [1, 0.4, 0.2],
    breathe: false,
    luminosity: 0.8,
  },
  // 235 Priest Sevina (MODEL_NPC_SEVINA), :11034.
  235: renderLight([6], [{ tex: 'flare', scale: 2.5 }]),
  // 238 Chaos Goblin (MODEL_MIX_NPC), :11031.
  238: renderLight([32], [{ tex: 'flare', scale: 1.5 }]),
};

// The golden line shares the model, and the original shares the render case
// with it: MODEL_VEPAR and MODEL_LIZARD are the same `o->Type` either way.
MONSTER_GLOWS[51] = MONSTER_GLOWS[45];
MONSTER_GLOWS[80] = MONSTER_GLOWS[46];
MONSTER_GLOWS[81] = MONSTER_GLOWS[48];

/** The glow a character type carries, if any. */
export function monsterGlowFor(npcType: number): MonsterGlow | undefined {
  return MONSTER_GLOWS[npcType];
}

// ---- 2. state + readers ----------------------------------------------------

/** One manager per texture *and* blend — `blendMode` is a manager setting. */
type ManagerKey = `${GlowTexture}:${GlowBlend}`;

const managers = new Map<ManagerKey, SpriteManager>();
const loading = new Set<ManagerKey>();

/**
 * Bumped by `reset()`. An OZJ still in flight across a map change belongs to
 * the scene that is being torn down, so its manager is dropped on arrival.
 */
let generation = 0;

/**
 * The manager for one texture, built on first use. Null until the OZJ has
 * decoded — a glow asked for meanwhile has no sprite for that card yet and
 * picks it up on a later frame.
 */
function managerFor(
  scene: Scene,
  tex: GlowTexture,
  blend: GlowBlend
): SpriteManager | null {
  const key: ManagerKey = `${tex}:${blend}`;

  const built = managers.get(key);
  if (built) return built;
  if (loading.has(key)) return null;

  loading.add(key);

  const { file, px } = GLOW_TEXTURES[tex];
  const mine = generation;

  void (async () => {
    try {
      const ozj = await downloadDataFile(file);
      if (mine !== generation) return;

      const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], { type: 'image/jpeg' });

      const manager = new SpriteManager(
        `monsterGlow:${key}`,
        URL.createObjectURL(blob),
        MAX_SPRITES_PER_MANAGER,
        { width: px[0], height: px[1] },
        scene
      );

      manager.blendMode =
        blend === 'subtract' ? Constants.ALPHA_SUBTRACT : Constants.ALPHA_ONEONE;
      manager.disableDepthWrite = true;
      manager.isPickable = false;
      manager.fogEnabled = false;

      if (mine !== generation) {
        manager.dispose();
        return;
      }

      managers.set(key, manager);
    } catch (err) {
      console.warn(`[monsterGlow] could not load ${file}`, err);
    } finally {
      loading.delete(key);
    }
  })();

  return null;
}

function disposeManagers(): void {
  generation++;
  for (const manager of managers.values()) manager.dispose();
  managers.clear();
  loading.clear();
}

/** One card of one glow: a sprite waiting for, or riding, a bone. */
type GlowSprite = {
  readonly bone: number;
  readonly tex: GlowTexture;
  readonly scale: number;
  readonly blend: GlowBlend;
  sprite: Sprite | null;
};

type LiveGlow = {
  readonly scene: Scene;
  readonly entity: Entity;
  readonly glow: MonsterGlow;
  readonly sprites: GlowSprite[];
  readonly rgb: readonly [number, number, number];
  clock: number;
  stopped: boolean;
};

const live = new Set<LiveGlow>();

/** How many monsters are glowing (debug). */
export function monsterGlowCount(): number {
  return live.size;
}

/** How many sprites that costs (debug). */
export function monsterGlowSpriteCount(): number {
  let n = 0;
  for (const g of live) n += g.sprites.length;
  return n;
}

function skipped(glow: MonsterGlow, bone: number): boolean {
  for (const [from, to] of glow.skip ?? []) if (bone >= from && bone <= to) return true;
  return false;
}

/**
 * The bones the cards hang on. `'body'` resolves against the loaded skeleton
 * — the original's `for (i < b->NumBones) if (!b->Bones[i].Dummy)`. The
 * converter keeps a dummy as a joint named `bone_<i>_Dummy`
 * (tools/bmdToGlb.ts:312), which is that test.
 */
function bonesOf(glow: MonsterGlow, entity: Entity): number[] {
  if (glow.bones !== 'body') return [...glow.bones];

  const bones = entity.modelObject?.gltf?.skeleton?.bones;
  if (!bones) return [];

  const out: number[] = [];
  // The GLB adds a root, so MU bone `i` is `bones[i + 1]` (core.ts `bonePos`).
  for (let i = 0; i + 1 < bones.length; i++) {
    if (skipped(glow, i)) continue;

    const bone = bones[i + 1];
    if (!bone.getTransformNode()) continue;
    if (bone.name.endsWith('_Dummy')) continue;

    out.push(i);
  }
  return out;
}

const tmpLocal = new Vector3();
const tmpWorld = new Vector3();

function place(g: LiveGlow): void {
  const [lx, ly, lz] = g.glow.local ?? [0, 0, 0];
  tmpLocal.set(lx, ly, lz);

  const lumi = g.glow.breathe
    ? Math.sin(g.clock * BREATH_SPEED) * BREATH_AMOUNT + BREATH_BASE
    : (g.glow.luminosity ?? 1);

  const [r, gr, b] = g.rgb;
  const hidden = g.entity.modelObject?.OutOfView === true;

  for (const s of g.sprites) {
    let sprite = s.sprite;

    if (!sprite) {
      const manager = managerFor(g.scene, s.tex, s.blend);
      if (!manager) continue;

      const { px } = GLOW_TEXTURES[s.tex];
      sprite = new Sprite(`monsterGlow`, manager);
      sprite.isPickable = false;
      sprite.width = (px[0] * s.scale) / TILE_CM;
      sprite.height = (px[1] * s.scale) / TILE_CM;
      sprite.color = new Color4(r * lumi, gr * lumi, b * lumi, 1);
      s.sprite = sprite;
    }

    sprite.isVisible = !hidden;
    if (hidden) continue;

    boneLocalPos(g.entity, s.bone, tmpLocal, tmpWorld);
    sprite.position.copyFrom(tmpWorld);
    sprite.color.set(r * lumi, gr * lumi, b * lumi, 1);
  }
}

function drop(g: LiveGlow): void {
  for (const s of g.sprites) {
    s.sprite?.dispose();
    s.sprite = null;
  }
  g.sprites.length = 0;
}

/**
 * Command: light a monster's own body. The handle ends it — the system stops
 * it when the monster dies or leaves; a map change ends every one.
 */
export function glowMonster(
  scene: Scene,
  entity: Entity,
  glow: MonsterGlow
): EffectHandle {
  const bones = bonesOf(glow, entity);
  if (!bones.length) return DEAD_HANDLE;

  const sprites: GlowSprite[] = [];
  for (const bone of bones) {
    for (const card of glow.cards) {
      sprites.push({
        bone,
        tex: card.tex,
        scale: card.scale,
        blend: card.blend ?? 'add',
        sprite: null,
      });
    }
  }

  const g: LiveGlow = {
    scene,
    entity,
    glow,
    sprites,
    rgb: glow.colour ?? RENDER_LIGHT_RGB,
    clock: 0,
    stopped: false,
  };

  live.add(g);
  place(g);

  return {
    get alive() {
      return live.has(g);
    },
    stop() {
      g.stopped = true;
    },
  };
}

function update(_map: number, dt: number): void {
  for (const g of live) {
    if (g.stopped || entityGone(g.entity)) {
      drop(g);
      live.delete(g);
      continue;
    }

    g.clock += dt;
    place(g);
  }
}

function reset(): void {
  for (const g of live) drop(g);
  live.clear();
  disposeManagers();
}

// ---- 3. the layer ----------------------------------------------------------

export interface MonsterGlowOptions {
  entity: Entity;
  glow: MonsterGlow;
}

export const monsterGlowLayer: EffectLayer<MonsterGlowOptions, 'monsterGlow'> = {
  name: 'monsterGlow',
  update,
  reset,
  spawn: (scene, _at, opts) => glowMonster(scene, opts.entity, opts.glow),
};
