/**
 * Sprite - a few additive billboard cards that appear at a point, grow, drift
 * and fade. The original's `CreateEffect(BITMAP_*, …)` for a flash, an impact
 * star, a spark cluster: each card lives a fixed number of ticks, scales
 * with `Scale` and fades through `Alpha` (ZzzEffect.cpp `MoveEffect`).
 *
 * Driven by: `effects.spawn('sprite', …)` from the skill table and anything
 * that wants a flash. Read by: nobody; it is fire-and-forget.
 */
import { Constants, Material, StandardMaterial, Vector3, type Scene } from '../libs/babylon/exports';
import {
  LiveList,
  acquireCard,
  additiveMaterial,
  darkCardGain,
  effectTexture,
  luma,
  releaseCard,
  setCardCell,
  fadeOut,
  hash,
  lerp,
  pointSource,
  type Card,
  type EffectBlend,
  type PointSource,
  type RGB,
  type SheetCells,
} from './core';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Default lifetime: MU's usual 20-tick effect at 25 Hz. */
const DEFAULT_SECONDS = 0.8;

/** Default card edge in tiles: 60 cm, a hand-sized flash. */
const DEFAULT_SIZE = 0.6;

/** Fraction of the life spent growing from `grow.from` to the full size. */
const GROW_FRACTION = 0.3;

// ---- 2. state + readers ----------------------------------------------------

export interface SpriteOptions {
  /** `Effect/…` sheet (recipes.ts `TEX`). */
  texture: string;
  colour?: RGB;
  /** Card edge in tiles. */
  size?: number;
  /** Lifetime in seconds. */
  seconds?: number;
  /** How many cards; more than one are jittered by `spread`. */
  count?: number;
  /** Random offset radius in tiles around `at` for each card. */
  spread?: number;
  /** Tiles per second upward drift (negative = fall). */
  rise?: number;
  /** World drift in tiles/s (the original's `Direction` per tick): a wave running along the facing. */
  move?: readonly [number, number, number];
  /** Size multiplier at the end of life (1 = constant, 2 = doubles). */
  grow?: number;
  /** Size multiplier at birth, before growing in over the first 30 %. */
  growFrom?: number;
  /** Radians per second the card turns on its axis. */
  spin?: number;
  /** Follow a moving point instead of staying where spawned. */
  follow?: PointSource;
  /** Tiles above `at` (or above the followed point) the cards sit. */
  height?: number;
  /** Non-billboard flat card laid on the ground (an impact ring). */
  flat?: boolean;
  /** Fade tail as a fraction of life (default 0.35). */
  fadeTail?: number;
  /** Brightness e^(-decay t) on top of the fade: a `Light /= 1.05` a tick is 25 ln 1.05. */
  decay?: number;
  /**
   * The texture is a sheet: play its cells once over the life, one card = one
   * cell (BITMAP_EXPLOTION's `Frame = (20 − LifeTime) / 2`). Without this the
   * whole sheet is one image - right for a single-frame flare, wrong for a
   * sheet with white filler cells.
   */
  cells?: SheetCells;
  /**
   * `add` (default) is `EnableAlphaBlend`: the sheet × `colour` added to the frame. `subtract`
   * is `RENDER_DARK`: a black card with the sheet as its coverage, drawn
   * `(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)` for the reason model.ts `subtractMaterial` gives - a
   * subtraction caps at the sheet's own levels, coverage can saturate. Evil Spirit's ghosts.
   */
  blend?: EffectBlend;
  /**
   * Dark cards: the multiplier on the sheet's luminance that is the coverage. Default
   * `luma(colour) × darkCardGain`; above 1 the body goes fully black and only the edges stay soft.
   */
  cover?: number;
  /** Size multiplier at progress 0..1; wins over `grow` / `growFrom` (a `Scale = sin(LifeTime)` pulse). */
  sizeAt?: (p: number) => number;
  /** A fixed turn of the card on its axis, radians (the original's `Rotation` rolled at birth). */
  roll?: number;
  /** Card height over width, for a sheet that is not square (Shiny02 is 32x64). */
  aspect?: number;
  /** The card's turn in the view plane, radians (the original's `Rotation`), when it does not `spin`. */
  rotation?: number;
}

const live = new LiveList();

/** How many sprite cards are alive (debug). */
export function spriteCount(): number {
  return live.size;
}

const tmp = new Vector3();
let seed = 0;

/**
 * A `RENDER_DARK` card's material, owned by the spawn: black, alpha-blended, the sheet's
 * luminance × `cover` as its alpha. `visibility` multiplies into the fragment alpha, so the
 * card fades like a bright one, and a cover above 1 saturates the body to black where the
 * original's subtract could only reach the sheet's own grey.
 */
function darkMaterial(scene: Scene, texture: string, cover: number): StandardMaterial {
  const mat = new StandardMaterial('fxCardDark', scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(0, 0, 0);
  mat.disableLighting = true;
  mat.alphaMode = Constants.ALPHA_COMBINE;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;
  mat.alpha = cover;
  let dead = false;
  mat.onDisposeObservable.addOnce(() => {
    dead = true;
  });
  void effectTexture(scene, texture).then(tex => {
    if (dead) return;
    tex.getAlphaFromRGB = true;
    mat.opacityTexture = tex;
  });
  return mat;
}

/** Spawn helper other entries call directly (the game master aura). */
export function spawnSprite(
  scene: Scene,
  at: Vector3,
  opts: SpriteOptions
): EffectHandle {
  const colour = opts.colour ?? RGBS.white;
  const dark = opts.blend === 'subtract';
  const material = dark
    ? darkMaterial(scene, opts.texture, opts.cover ?? luma(colour) * darkCardGain(scene))
    : additiveMaterial(scene, opts.texture, colour);
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const size = opts.size ?? DEFAULT_SIZE;
  const count = Math.max(1, opts.count ?? 1);
  const spread = opts.spread ?? 0;
  const rise = opts.rise ?? 0;
  const move = opts.move ?? [0, 0, 0];
  const grow = opts.grow ?? 1;
  const growFrom = opts.growFrom ?? 1;
  const spin = opts.spin ?? 0;
  const height = opts.height ?? 0;
  const tail = opts.fadeTail ?? 0.35;
  const decay = opts.decay ?? 0;
  const cells = opts.cells;
  const source = opts.follow ? opts.follow : pointSource(at);

  const cards: Card[] = [];
  const offsets: Vector3[] = [];
  const phases: number[] = [];
  for (let i = 0; i < count; i++) {
    const card = acquireCard(scene, material, !opts.flat);
    if (opts.flat) card.rotation.x = Math.PI / 2;
    if (opts.roll !== undefined) card.rotation.z = opts.roll;
    cards.push(card);
    const s = seed++;
    offsets.push(
      new Vector3(
        (hash(s) - 0.5) * 2 * spread,
        hash(s + 0.5) * spread * 0.5,
        (hash(s + 0.25) - 0.5) * 2 * spread
      )
    );
    phases.push(hash(s + 0.75) * Math.PI * 2);
  }

  let t = 0;
  // -1 until the sheet is loaded and a cell has actually been applied.
  let frame = -1;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      if (cells) {
        const f = Math.min(cells.count - 1, Math.floor(p * cells.count));
        if (f !== frame) {
          let applied = true;
          for (const c of cards) applied = setCardCell(c, cells, f) && applied;
          if (applied) frame = f;
        }
      }
      // Until the sheet is in, the card would be a solid square of the tint: hold it invisible.
      const ready = (dark ? material.opacityTexture : material.diffuseTexture) ? 1 : 0;
      source(tmp);
      const grown = p < GROW_FRACTION ? lerp(growFrom, 1, p / GROW_FRACTION) : lerp(1, grow, (p - GROW_FRACTION) / (1 - GROW_FRACTION));
      const s = size * (opts.sizeAt ? opts.sizeAt(p) : grown);
      // The original's `Alpha`: the card's colour fades to black (core.ts
      // `ADDITIVE_ALPHA_MODE`); it used to shrink instead.
      const vis = ready * fadeOut(p, tail) * (decay > 0 ? Math.exp(-decay * t) : 1);
      const y = height + rise * t;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const o = offsets[i];
        c.position.set(tmp.x + o.x + move[0] * t, tmp.y + o.y + y + move[1] * t, tmp.z + o.z + move[2] * t);
        c.scaling.setAll(s);
        if (opts.aspect) c.scaling.y = s * opts.aspect;
        c.visibility = vis;
        if (opts.rotation !== undefined && !spin && !opts.flat) c.rotation.z = opts.rotation;
        if (spin) {
          if (opts.flat) c.rotation.y = phases[i] + spin * t;
          else c.rotation.z = phases[i] + spin * t;
        }
      }
      return true;
    },
    release() {
      for (const c of cards) releaseCard(scene, c);
      cards.length = 0;
      // The dark material is this spawn's own; the additive one is core.ts's cache.
      if (dark) material.dispose(false, false);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const spriteLayer: EffectLayer<SpriteOptions, 'sprite'> = {
  name: 'sprite',
  update,
  reset,
  spawn: spawnSprite,
};
