import {
  Vector3,
  type DirectionalLight,
  type Effect,
  type Scene,
} from '../babylon/exports';
import { ENUM_WORLD } from '../../common/types';
import { GameOptions } from '../../common/gameOptions';
import { snowCover } from '../../weather/snowCover';
import { snowTrailPainted, snowTrailTexture } from '../../weather/snowTrail';
import { MELT_EDGE, MELT_SPOTS, snowMeltUniform } from '../../weather/snowMelt';
import { puddleCover, wetness } from '../../weather/wetness';
import { rainStrength } from '../../weather/rainState';
import { pointLightPoolLights } from '../../common/pointLightPool';
import { shownFogColor } from '../../scenes/enhancedLighting';
import { shownSkyLight } from '../../scenes/sceneLook';

/**
 * Terrain overlays: masked layers mixed into the ground's albedo before it is
 * lit, for the weather effects that touch the ground rather than fall through
 * the air.
 *
 * This closes a long-standing gap — *"leaves settling on terrain,
 * and `BITMAP_RAIN_CIRCLE` splashes — GPU particles cannot read the height
 * map, so both fade instead"*. A particle genuinely cannot read the height
 * map; the terrain shader is already standing on it. So settled snow, wet
 * stone, puddles and [Atlans' caustics] are one mechanism rather than
 * four bespoke passes, which is why this is a recipe list and not a hard-coded
 * snow branch.
 *
 * Layers compile in only where a map has them: Lorencia's shader carries the
 * two wet-weather layers and nothing else, and a map with no recipe gets the
 * shader it always had, byte for byte.
 *
 * The mix happens **before** the lighting multiply, so a layer is lit by the
 * same bake, sun shadow and torchlight as the ground under it. Snow in the
 * shade of a wall is shaded snow, and a puddle in a doorway is a dark puddle,
 * which is the entire difference between this and a decal.
 *
 * ### Everything except coverage is a compile-time constant
 *
 * A layer's colour, patch size, edge softness and slope limit are baked into
 * the generated GLSL as literals. Only `coverage` — the one value that
 * genuinely changes per frame — is a uniform, and it is its own `float`.
 *
 * That is a deliberate failure-mode choice, not tidiness. A uniform that does
 * not reach the GPU reads as zero; with the colour in a uniform, "zero" meant
 * *mix the ground toward black*, and a single unbound uniform turned the whole
 * map pitch black. With only coverage in a uniform, "zero" means *no layer* —
 * the ground renders exactly as it would with the feature switched off. The
 * shader can no longer fail into a worse state than not having the feature.
 */

/** How a layer's colour meets the ground under it. */
export type OverlayBlend =
  /** Lerp toward the colour: something lying *on* the ground (snow). */
  | 'mix'
  /** Multiply the ground by the colour: the ground itself changed (wet). */
  | 'multiply';

export type TerrainOverlay = {
  readonly name: string;
  /** Linear RGB of the layer at full strength. */
  readonly colour: readonly [number, number, number];
  readonly blend: OverlayBlend;
  /**
   * How much of the layer is down, 0…1, read every frame. The recipe owns its
   * own driver so the shader stays generic — snow reads its accumulator, wet
   * ground reads the rain's.
   */
  readonly coverage: () => number;
  /** Patch size: repeats of the break-up noise per tile. Smaller = broader. */
  readonly patchScale: number;
  /** Edge width of a patch, in noise units. 0 = a hard cut. */
  readonly softness: number;
  /**
   * Ground steepness the layer starts sliding off, as a surface normal Y.
   * 1 is dead flat; 0.85 is a gentle bank. Below this the layer fades out.
   */
  readonly slopeKnee: number;
  /**
   * Normal Y at which the layer is complete. Default 1 (dead flat), which
   * is what the wet layers were tuned on; a layer that lies on hillsides
   * (snow) sets this well under 1 so sloped tiles are not half-covered.
   */
  readonly slopeTop?: number;
  /** Skip tiles the mask says are roofed. */
  readonly outdoorOnly: boolean;
  /**
   * How much of the layer each of the map's **tile textures** holds, 0…1,
   * indexed like `getTilesList(map)`. Tiles not listed take `bedDefault`.
   *
   * This is what keeps settled snow off swept paving. Without it the layer
   * is uniform over every open tile, so the square's flagstones whitened
   * exactly like the drifts beside them, and — because the footprint and
   * sink code read the same field — boots punched snow holes into stone.
   * The shader mixes the two mapping layers by the same alpha the ground
   * does, so a path painted over snow thins the layer the way it thins the
   * snow texture under it. `snowSink.ts` reads the same table on the CPU.
   */
  readonly bed?: Readonly<Record<number, number>>;
  /** Share for a tile `bed` does not name. Only read when `bed` is set. */
  readonly bedDefault?: number;
  /**
   * Brightness variation across the layer's own surface, as a fraction. 0 is
   * a flat wash of `colour`.
   *
   * Separate from `patchScale`, which decides *where* the layer is. This is
   * what the layer looks like once it is there — settled snow is not a flat
   * white, it is drifted and scalloped, and without this a fully covered
   * Devias reads as a sheet of paper laid over the map.
   */
  readonly grain?: number;
  /** Repeats of the grain noise per tile. ~1 gives drifts a tile across. */
  readonly grainScale?: number;
  /**
   * Relative weight of this layer's own surface relief. 0, the default, emits
   * no relief code at all, so a layer without it compiles to exactly the
   * shader it did before relief existed.
   *
   * This is what separates a layer that has *form* from one that is paint.
   * Until this went in, a layer only ever changed the ground's **colour**: the
   * mix ran and then the ground was lit by `vColor` — the baked lightmap of
   * the rock underneath — so a drift and a flat plain took byte-identical
   * light and no amount of albedo variation could suggest otherwise. Bending
   * the normal is the fix, and everything else here hangs off it.
   *
   * The absolute strength lives in `SNOW_SHADE.relief`, a uniform, so it can
   * be dialled without a shader rebuild. This is only the per-layer share.
   */
  readonly relief?: number;
  /**
   * Repeats of the relief noise per world unit — a tile is 1. ~0.8 gives
   * drifts a little over a tile across, which is the scale that reads from
   * the game's camera height.
   */
  readonly reliefScale?: number;
  /**
   * This layer carries the hero's ploughed trail (weather/snowTrail.ts): the
   * depth map is subtracted from its relief, with a heaped rim raised along
   * the channel's edge and the floor churned. Requires `relief`.
   */
  readonly trail?: boolean;
  /**
   * This layer can be burned off the ground (weather/snowMelt.ts): the fire
   * skills' melt patches divide its **target**, so coverage, depth, relief,
   * drift lighting and any trail ploughed through it thin together, and the
   * ground the fire uncovers is damped down as wet rather than left as the
   * bare tile.
   *
   * Costs no sampler — the patches ride in a small uniform array, the way the
   * torch pool does for `reflect`.
   */
  readonly melt?: boolean;
  /**
   * Extra target above the coverage, so that at coverage 1 the layer is
   * SOLID where its bed is 1. The break-up noise runs 0…1 and the edge is
   * `softness` wide either side of it, so without this a full cover still
   * leaves bare ground wherever the noise sits within `softness` of 1 —
   * on screen, dark blotches in a field that should be closed. 0 (default)
   * keeps the exact behaviour the wet layers were tuned against.
   */
  readonly headroom?: number;
  /**
   * How much of the map's baked light this layer replaces with its own,
   * 0…1. A layer that LIES ON the ground (snow) is a different material
   * from the ground, and the lightmap was baked for grass and stone under
   * a blue grade: through it white snow comes out cyan, and every dark
   * patch in the bake becomes a stain on the snow. At 1 the layer keeps
   * only the bake's SHADING, as luminance, and is lit white with pale
   * blue-grey shadows (OVERLAY_LIGHT); at 0 it is lit like the ground.
   * See `terrainOverlayLitGlsl`.
   */
  readonly lightNeutral?: number;
  /**
   * This layer is standing water, and reflects. Emits `terrainOverlayReflectGlsl`
   * after the lighting: a Fresnel share of a **built sky** (a horizon-to-zenith
   * gradient with a parallaxing cloud deck over it), the sun's halo and glint,
   * and a highlight from each of the point-light pool's torches — all read off
   * a normal carrying both the wind ripple and the rings of individual
   * raindrops. Without it a puddle layer is only a darkening, which is what
   * read as "black paint" instead of water; with a flat sky colour instead of
   * the gradient it read as a texture laid on the ground.
   */
  readonly reflect?: {
    /** Gain on the sky the water reflects. */
    readonly sky: number;
    /** Specular exponent: higher = tighter torch and sun glints. */
    readonly gloss: number;
    /**
     * Wind-ripple normal slope at full rain. 0 = a mirror.
     *
     * Only the broad wind chop. The raindrop rings are not scaled by it —
     * how many drops are landing is a fact about the sky, not about how
     * glossy this map's water was dialled (see `RING_SLOPE`).
     */
    readonly ripple: number;
  };
};

/**
 * How a `lightNeutral` layer is lit, in place of the map's bake.
 *
 * `shadow` is what the layer looks like where the bake is dark or the sun
 * is cut by the cascades: sky-lit snow, a pale blue-grey, never the map's
 * own hue and never black. `gain` scales the bake's luminance before it
 * picks between shadow and full white — Devias' open ground bakes around
 * 0.6–0.8, and 1.3 puts open ground at white while the authored shadows
 * under walls and trees keep their shape.
 */
export const OVERLAY_LIGHT = {
  // Near-neutral: the original bakes Devias neutral and puts no grade on the
  // ground, so its snow shadows are grey with only a hint of sky. The first
  // cut here was a saturated blue-grey and the field read as blue ice.
  // Measured off improved_2.jpg: the deepest drift shade is ~0.62 of white.
  shadow: [0.6, 0.63, 0.7] as readonly [number, number, number],
  /**
   * What full sun on the layer is. NOT white: the reference field sits at
   * ~0.86, and it is that headroom under 1.0 that lets the drift relief and
   * the trench lips show as brighter than the field. With this at 1.0 the
   * field clipped to flat paper and every shading term above it vanished.
   */
  lit: [0.86, 0.88, 0.92] as readonly [number, number, number],
  /** Hard cap after the dynamic lights are added, so a torch cannot clip it. */
  cap: 0.95,
  gain: 1.3,
};

/**
 * Settled snow on Devias.
 *
 * Deliberately not pure white: fresh snow lit by the map's cold bake reads as
 * blown-out paper at 1.0, and Devias' grade is already blue. Slightly under
 * white, faintly warm, lets the lightmap do the colouring.
 */
export const SNOW_COVER: TerrainOverlay = {
  name: 'snowCover',
  // Near-white, a hair warm. The blue cast the field used to have with
  // post-processing off was never this colour: it was the lightmap ×
  // DEVIAS_MOOD.terrainBake [1.02, 1.08, 1.18] multiplied in afterwards, and
  // no albedo survives a 1.16 blue-over-red gain on top of a blue bake. That
  // is now taken out of the snow's share of the light by `lightNeutral`
  // below, so this can be what snow actually is; the residual warmth only
  // keeps it off dead paper-white in full sun.
  colour: [0.985, 0.98, 0.965],
  blend: 'mix',
  coverage: snowCover,
  // Snow is lit as snow, not as the grass the lightmap was baked for: the
  // bake keeps its shading and loses its hue (see `lightNeutral` on the
  // type). The remaining tenth is what still ties a drift to the map's
  // grade so it does not float over the ground like a decal.
  lightNeutral: 1,
  // Solid at full cover on the snow tiles; the bed table alone thins it on
  // cobbles and flagstones.
  headroom: 0.25,
  // Where on Devias' ground snow can lie, by tile texture (World3/Tile*.jpg,
  // in getTilesList order):
  //   0 TileGrass01, 1 TileGrass02, 7 TileRock01 - painted snow: full.
  //   4 TileGround03 - cobbles with snow packed between; 6 TileWood01 -
  //     frosted blue stone: snow sits in the gaps, so a good part.
  //   5 TileWater01 - none.
  //   2 TileGround01 - the open field's dark ground, snowed under in the
  //     reference frames: full. Was 0.3, which left bare navy tiles in the
  //     middle of the snowfield.
  //   3 TileGround02 (boards), 8/9
  //     TileRock02/03 (the square's flagstones), 10-13 interior floors:
  //     `bedDefault`, a thin wash that leaves sparse patches on swept stone
  //     and is under the footprint threshold (SNOW_TILE_MIN), so nothing is
  //     stamped into it.
  bed: { 0: 1, 1: 1, 2: 1, 7: 1, 4: 0.55, 6: 0.55, 5: 0 },
  bedDefault: 0.3,
  // A patch every ~7 tiles, with the second octave breaking that up further.
  patchScale: 0.14,
  softness: 0.12,
  // Snow holds on anything short of a cliff face; complete by 45 degrees.
  slopeKnee: 0.45,
  slopeTop: 0.72,
  outdoorOnly: true,
  // Drifts about a tile across, plus a finer octave for the grain of it.
  grain: 0.035, // was 0.1: most of the "dirty" mottling on an even white field
  grainScale: 0.9,
  // The one layer with a surface of its own. Wet ground and puddles are the
  // ground seen through water, not a substance lying on it, so neither has
  // relief and neither emits a line of the code below.
  relief: 1,
  // Drifts about three tiles across.
  //
  // Was 0.8 - a drift barely wider than a tile - and on screen that did not
  // read as a snowfield with form, it read as mottling. The lesson is that
  // the frequency matters more than the contrast: at a tile per feature the
  // eye classifies it as surface noise however well lit it is, and turning
  // the contrast up (which is what the first version did) makes it a louder
  // noise rather than a landscape. Drifts have to be big enough to be
  // FEATURES, with the smaller octaves as their texture.
  reliefScale: 0.16, // was 0.3: broader, gentler roll the eye reads as ground, not texture
  trail: true,
  // Fire takes it off the ground (weather/snowMelt.ts). The one layer that
  // can be melted: the wet layers ARE water, and a fireball does not dry a
  // street it lands in for more than the moment it is burning.
  melt: true,
};

/**
 * Rain-darkened ground: the broad one of the two wet layers.
 *
 * Wet stone is darker and less saturated than dry stone, because the water
 * film fills the surface roughness and sends most of the scattered light
 * forward instead of back at the eye. That is why this multiplies rather than
 * mixing — it is the same ground, seen through water, not a coat of paint.
 *
 * Broad and soft (`patchScale` well under the puddle layer's) so it reads as
 * the whole street darkening, with the dry patches under eaves and against
 * walls surviving longest.
 */
export const WET_GROUND: TerrainOverlay = {
  name: 'wetGround',
  colour: [0.63, 0.65, 0.7],
  blend: 'multiply',
  coverage: wetness,
  // The river is already wet.
  bed: { 5: 0 },
  bedDefault: 1,
  patchScale: 0.06,
  softness: 0.3,
  // Rain wets a slope as readily as a flat, so this barely cares.
  slopeKnee: 0.45,
  outdoorOnly: true,
};

/**
 * Standing water on top of the wet ground.
 *
 * Much darker, much sharper-edged, and — the point of it — held only by
 * near-flat ground: `slopeKnee` at 0.985 means a tile has to be within a few
 * degrees of level to pool at all, so water sits in the streets and squares
 * and never on the ramps or the banks. Terrain quads carry a per-tile normal,
 * so this is effectively a per-tile test, which is exactly the granularity a
 * puddle wants.
 *
 * It lags the damp layer through `puddleCover`: stone goes dark almost at
 * once, but water needs somewhere to collect first.
 */
export const PUDDLES: TerrainOverlay = {
  name: 'puddles',
  // Lifted from 0.32/0.35/0.43: the water is no longer carried by how dark
  // it is. Standing water over stone shows the stone through it, a little
  // darker and bluer, and what says "water" is what it REFLECTS (below).
  colour: [0.5, 0.53, 0.6],
  blend: 'multiply',
  // CAPPED, hard. The accumulator reaches 0.9 in a long downpour, and the
  // amount is a threshold of 0..1 noise against the coverage — so at 0.9,
  // nine tenths of the flat ground was under water: a flood, not puddles.
  // Water stands in the LOW spots, which no amount of rain makes most of a
  // street. The cap keeps the worst downpour at scattered pools.
  coverage: () => Math.min(0.42, puddleCover() * 0.55),
  // Up from 0.22: pools a tile or two across, not ponds five tiles wide.
  patchScale: 0.34,
  softness: 0.045,
  slopeKnee: 0.985,
  outdoorOnly: true,
  // Not on the river (tile 5 is the animated water) - rain does not leave
  // puddles on a river, and the reflection foil over the water texture was
  // the first thing wrong in the screenshot. Everything else takes them.
  bed: { 5: 0 },
  bedDefault: 1,
  // What makes these puddles and not dark paint: the sky the shader builds
  // (SKY_/CLOUD_ block), the sun's halo, and the drops landing on them
  // (RING_ block). The colour above is only the stone seen through water.
  reflect: { sky: 1.0, gloss: 48, ripple: 0.35 },
};

/**
 * How a relief layer is shaded, live.
 *
 * These four are the only numbers in this file that are **not** baked into the
 * GLSL, and the exception is deliberate. Everything else here — colour, patch
 * size, softness, slope limit — is a compile-time literal because a uniform
 * that fails to reach the GPU reads as zero, and zero for a *colour* meant
 * mixing the ground toward black. Zero for each of these means "this term
 * contributes nothing". A uniform is allowed here precisely because it cannot
 * fail into anything worse than the feature being off.
 *
 * These are tuning, not a switch. Zeroing all four flattens the *shading* but
 * leaves the thin-snow cover modulation running, so it is not a way back to
 * the exact shader this file emitted before relief existed. The real switch is
 * `advancedEffects`, which zeroes coverage and skips the whole branch; a map
 * with no relief layer never compiles a line of it in the first place.
 *
 * The other reason is honesty about how this gets finished. The look is a
 * matter of taste that costs a shader rebuild and a map reload to sample once,
 * which is a slow enough loop to be worth designing out. `window.muSnow`
 * moves all four from the console with no rebuild at all.
 */
export const SNOW_SHADE = {
  /**
   * Slope of the drift field: how steeply the snow surface rises and falls.
   *
   * Drives the geometry, and the shading follows from it rather than being its
   * own dial — a steeper drift catches more sun on its lit face and loses more
   * on its far one because that is what the normal says, not because a second
   * number was turned up to say so.
   *
   * A slope gain, not a world height, and it is tied to `reliefScale`: the
   * shader divides it by `RELIEF_STEP`, and a field of broad drifts has a
   * gentler gradient than a field of narrow ones at the same amplitude. When
   * the drifts went from a tile across to three, the same 0.8 dropped the
   * faces from 20 degrees to 6.6 and the contrast from 2.2x to 1.3x. Swept
   * again at the new scale: 2.4 puts it back at 19 degrees median and 2.1x.
   *
   * Then halved. Matched against reference frames (improved.jpg /
   * improved_2.jpg, repo root) with post-processing OFF: 2.4 read as a
   * rippled field, every drift face swinging the albedo hard either side of
   * 1, where the reference is a near-flat white with broad, soft shading
   * and a single visible tone step at a drift edge. 1.1 lands ~9 degrees
   * median and ~1.35x lit-to-shaded with the floor below, which is what
   * the reference measures.
   */
  // Back up from 1.1: that was tuned while the field clipped to white, where
  // any relief read as ripple. With the field at 0.86 the drifts need real
  // slope to show volume - the reference banks visibly against walls.
  relief: 0.55, // was 2.2: the field banded into blurred stripes; improved_2.jpg is near-flat (trench has TRAIL_GAIN)
  /**
   * How far the troughs between drifts go toward skylight, 0..1.
   *
   * A tint rather than a darkening: what a trough loses is the warm direct
   * sun, and what is left is the cold half of the sky. Runs after the shading
   * floor, so the darkest place on a snowfield is a cool blue rather than a
   * black hole - the same complaint the footprint work ran into, fixed the
   * same way and with the same colour so the two agree on one map.
   */
  cavity: 0.35,
  /**
   * Sheen off the lit faces, plus the sparse glints. Snow is not matte, but
   * the reference is close to it: a soft broad sheen and rare glints, no
   * ripple highlights. 0.3 with the old relief put a highlight on every
   * ripple crest; at the new relief 0.2 is a broad sheen only.
   */
  sheen: 0.08, // reference snow is matte
  /**
   * Crystal grain: the texture of the surface itself, under the drifts.
   *
   * Not the same thing as the mottling that was cut two rounds ago, and the
   * difference is the scale. That was a feature about a TILE across, which the
   * eye reads as noise laid over the ground. This is nine repeats per tile -
   * well under a footprint - which the eye reads as what the ground is MADE
   * OF. Without it a fully covered field is a smooth wash with some large soft
   * shading on it, and it looks smudged however good the drifts are.
   *
   * Small, and it has to be. The grain folds into the same normal as the
   * drifts, so too much of it does not sit on top of the structure - it
   * REPLACES it. Measured as detail energy in two spatial bands, sub-tile
   * against drift-scale:
   *
   *     0.008   2.56x fine   1.03x coarse
   *     0.015   4.50x fine   1.11x coarse   <- chosen
   *     0.022   6.45x fine   1.22x coarse
   *     0.05   13.44x fine   1.78x coarse
   *
   * 0.05 buys five times the surface texture for a fifth of the drift
   * structure, which is the trade worth making.
   */
  // Halved from 0.015 against the reference frames: with post-processing
  // off there is no bloom to soften it, and 0.015 read as a wind-ripple
  // texture over the whole field. The reference surface is smooth with a
  // faint grain only visible near the camera.
  grain: 0.003,
  /**
   * Pushes every drift deeper without moving where snow settles. Separate from
   * coverage, which decides *whether* there is snow here; this is how much.
   */
  depth: 0,
};

const SNOW_SHADE_DEFAULTS = { ...SNOW_SHADE };

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).muSnow = {
    get: () => ({ ...SNOW_SHADE }),
    /** How much snow is on the ground right now, 0…1 (snowCover.ts). */
    cover: () => snowCover(),
    /** Takes effect on the next frame — these are uniforms, not literals. */
    set(next: Partial<typeof SNOW_SHADE>) {
      Object.assign(SNOW_SHADE, next);
      return { ...SNOW_SHADE };
    },
    reset() {
      Object.assign(SNOW_SHADE, SNOW_SHADE_DEFAULTS);
      return { ...SNOW_SHADE };
    },
  };
}

/**
 * World-space direction *toward* the sun.
 *
 * Cached per scene: this is read on every material bind, and `getLightByName`
 * is a linear scan of the scene's lights behind a string compare.
 */
let sunScene: Scene | null = null;
let sunDir = new Vector3(-0.4, 1, -0.6).normalize();

function sunDirection(scene: Scene): Vector3 {
  if (scene === sunScene) return sunDir;

  const sun = scene.getLightByName('sunLight') as DirectionalLight | null;
  if (!sun) return sunDir;

  const d = sun.direction;
  sunScene = scene;
  sunDir = new Vector3(-d.x, -d.y, -d.z).normalize();

  return sunDir;
}

/** CPU mirror of the shader's `overlayHash` (Hoskins' hash21). */
function overlayHash21(x: number, y: number): number {
  const fr = (v: number) => v - Math.floor(v);
  let px = fr(x * 0.1031);
  let py = fr(y * 0.1031);
  let pz = fr(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d;
  py += d;
  pz += d;
  return fr((px + py) * pz);
}

/** CPU mirror of the shader's `overlayNoise`: value noise, 0…1. */
function overlayNoiseAt(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = overlayHash21(ix, iy);
  const b = overlayHash21(ix + 1, iy);
  const c = overlayHash21(ix, iy + 1);
  const d = overlayHash21(ix + 1, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/**
 * How much of layer `o` the shader draws at world (x, z), 0…1, given the
 * ground's normal Y there and whether the sky is open — the same break-up
 * noise, threshold and slope test the GLSL block runs, so the CPU can ask
 * "is there a puddle under this boot" and get the answer the eye sees.
 * Bed share is the caller's (see `overlayBedShare`).
 */
export function overlayAmountAt(
  o: TerrainOverlay,
  x: number,
  z: number,
  normalY: number,
  open: boolean
): number {
  const coverage = o.coverage();
  if (coverage <= 0) return 0;
  if (o.outdoorOnly && !open) return 0;

  const px = x * o.patchScale;
  const pz = z * o.patchScale;
  const breakup =
    overlayNoiseAt(px, pz) * 0.65 + overlayNoiseAt(px * 2.7, pz * 2.7) * 0.35;

  const knee = o.slopeKnee;
  const top = o.slopeTop ?? 1;
  let flat = (Math.min(1, Math.max(0, normalY)) - knee) / (top - knee);
  flat = Math.min(1, Math.max(0, flat));
  flat = flat * flat * (3 - 2 * flat);

  const target = Math.min(1, coverage) * (1 + (o.headroom ?? 0)) * flat;

  const lo = breakup - o.softness;
  const hi = breakup + o.softness;
  let t = (target - lo) / (hi - lo);
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

/**
 * How much of `o` this tile texture holds, per `bed`. 1 for a layer with no
 * bed table — such a layer lies on every tile alike.
 */
export function overlayBedShare(o: TerrainOverlay, tile: number): number {
  if (!o.bed) return 1;
  return o.bed[tile] ?? o.bedDefault ?? 1;
}

/** Whether any layer takes the ploughed trail. */
export function hasTrail(overlays: readonly TerrainOverlay[]): boolean {
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].trail && overlays[i].relief) return true;
  }
  return false;
}

/** Whether any layer can be melted off the ground by fire. */
export function hasMelt(overlays: readonly TerrainOverlay[]): boolean {
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].melt) return true;
  }
  return false;
}

/** Whether any layer carries surface relief. Allocation-free; called per bind. */
function hasRelief(overlays: readonly TerrainOverlay[]): boolean {
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].relief) return true;
  }
  return false;
}

/** Whether any layer is standing water that reflects. */
function hasReflect(overlays: readonly TerrainOverlay[]): boolean {
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].reflect) return true;
  }
  return false;
}

/** Torches the water can reflect at once. Matches the pool's smallest budget. */
const REFLECT_LIGHTS = 6;

/** Ripple field: repeats per tile, and the gradient step in tiles. */
const RIPPLE_SCALE = 7;
const RIPPLE_STEP = 0.02;

/**
 * Reflectance at normal incidence. Water is 0.02; this is deliberately
 * higher. The camera sits at ~45°, where physical Fresnel gives ~0.03 and
 * the sky in the water is invisible - and a puddle that reflects nothing is
 * exactly the "black paint" this exists to fix. Water in games is drawn
 * more reflective than it is for the same reason it is drawn bluer.
 */
const REFLECT_F0 = 0.12;

/** Sun glint and torch glint gains on top of the Fresnel share. */
const SUN_GLINT = 1.4;
const TORCH_GLINT = 2.2;

/**
 * Besides the pin-point glint, a torch lays a broad soft glow on the water
 * under it - the smeared reflection of the flame itself. A wider lobe at a
 * fraction of the gain.
 */
const TORCH_GLOW = 0.35;
const TORCH_GLOW_GLOSS = 5;

/**
 * The sky the water reflects — a **fake** one, built in the shader.
 *
 * The first cut reflected `ovSky` alone: one flat colour, the map's fog,
 * scaled by Fresnel. That is a wash, and a wash is exactly what reads as a
 * texture laid on the ground rather than as water — because the one thing
 * every real puddle does is show a *different* piece of sky at every point
 * of it, and slide that piece as you walk. Nothing here is a real
 * reflection (there is no second pass and no probe); it is the two cues
 * that carry one:
 *
 *  1. **A gradient.** The mirrored view ray is steep at the far edge of a
 *     pool and grazing at the near one, so the far edge shows zenith and
 *     the near edge shows horizon. `ovSky` is the horizon (the fog colour,
 *     which is literally what the map's distance fades to) and `ovSkyHi`
 *     the zenith (the mood's own sky light, `shownSkyLight`).
 *  2. **Structure that parallaxes.** A cloud deck `CLOUD_HEIGHT` tiles up,
 *     hit by that same mirrored ray. Because the ray's elevation changes
 *     across the pool, the deck is sampled *further away* at the grazing
 *     edge — so the clouds stretch toward the near edge and swim when the
 *     camera moves, which a scrolling texture cannot fake.
 *
 * `SKY_GRADIENT_POW` above 1 keeps most of a pool in horizon colour and
 * gives the zenith only to the steepest rays, which is what the Fresnel
 * geometry actually does.
 */
const SKY_GRADIENT_POW = 1.5;

/**
 * The least the zenith must be under the horizon, as a fraction. Guarantees
 * a visible gradient on a map whose sky light and fog colour happen to
 * agree — without it such a map reflects a flat wash and the water goes back
 * to reading as paint.
 */
const ZENITH_SEPARATION = 0.25;

/** Tiles above the water the cloud deck sits. Lower = more parallax. */
const CLOUD_HEIGHT = 12;
/** Repeats of the cloud noise per tile on the deck: a feature ~20 tiles wide. */
const CLOUD_SCALE = 0.05;
/** Tiles per second the deck slides. Slow — this is weather, not a conveyor. */
const CLOUD_DRIFT = 0.6;
/** Noise window the cloud breaks open in, and how much brighter a break is. */
const CLOUD_LO = 0.44;
const CLOUD_HI = 0.74;
const CLOUD_LIT = 1.55;

/**
 * The sun's broad halo, under the pin-point glint: the smeared bright patch
 * of sky around it, which is most of what a real puddle shows of the sun.
 * The glint alone is a star on a flat field.
 *
 * Tested on the mirrored ray against the sun direction — a lobe in the sky,
 * not on the surface — so it moves across the pool and shivers with the
 * rings. The exponent is what a hazy sun looks like: wide enough to be a
 * patch, tight enough to have an edge.
 */
const SUN_HALO = 0.6;
const SUN_HALO_GLOSS = 8;

/**
 * Raindrop rings — the drops landing on the standing water.
 *
 * One impact per cell per `RING_PERIOD`, re-rolled every period so the drop
 * moves and a cell can sit a period out; that re-roll is what lets the
 * density follow the rain instead of every cell firing forever. The ring is
 * confined inside its own cell, so the field costs two hash lookups rather
 * than a 3x3 neighbourhood walk, and two layers at different scales hide the
 * lattice.
 *
 * They perturb the **normal the reflection is read off**, not the albedo:
 * a raindrop ring is visible because it bends what the water is showing you,
 * and painting rings on would be the same texture mistake as the flat sky.
 */
/** Ring cells per tile. 1.6 gives a ring up to ~0.26 tiles across. */
const RING_SCALE = 1.6;
/** The second layer's cells, relative to the first. Not a whole multiple. */
const RING_SCALE_2 = 1.63;
/** Seconds between one cell's impacts. */
const RING_PERIOD = 0.9;
/**
 * How far a ring spreads before it dies, in cells. The fade below takes the
 * amplitude to zero at exactly this radius, which is what confines a ring to
 * its own cell and buys the whole field its cheapness — so this and
 * `RING_FADE` must stay under 0.5 together.
 */
const RING_MAX = 0.44;
/** Width of the crest, in cells. Wider = a fatter, gentler ring. */
const RING_WIDTH = 0.18;
/** Radius the ring starts fading at, in cells. */
const RING_FADE = 0.28;
/**
 * Slope the crest puts on the water, per unit of the ring's own gradient.
 * The profile's derivative peaks near PI / RING_WIDTH, so this is small by
 * construction.
 *
 * Swept (a 40x40-tile patch over 20 s, all four values varied together): at
 * 0.04 a downpour has rings over ~32 % of the water, tilting it 7 degrees on
 * average and 33 at the steepest part of a fresh crest, and the lightest
 * shower that can pool at all still dimples ~7 %. Under half that the rings
 * were there in a still frame and invisible in motion; much over it the pool
 * goes to foil, which is the failure the wind ripple already had once.
 */
const RING_SLOPE = 0.04;
/**
 * Share of cells carrying a drop, per unit of rain. Over 1 so a light
 * shower still dimples the water: the puddles only exist because it has
 * been raining, so "rain 0.2, almost no rings" is never the right picture.
 */
const RING_DENSITY_GAIN = 2.2;

const OVERLAYS_BY_WORLD: Partial<Record<ENUM_WORLD, readonly TerrainOverlay[]>> =
  {
    [ENUM_WORLD.WD_0LORENCIA]: [WET_GROUND, PUDDLES],
    [ENUM_WORLD.WD_3NORIA]: [WET_GROUND, PUDDLES],
    [ENUM_WORLD.WD_2DEVIAS]: [SNOW_COVER],
  };

const NONE: readonly TerrainOverlay[] = [];

/**
 * The layers this map draws, or nothing if the player has ground weather off.
 *
 * Read at *map load*, so switching the option off and walking through a gate
 * gets a terrain shader with no overlay branch in it at all. Switching it off
 * without reloading is handled at the other end, in `bindTerrainOverlays` —
 * between them the option both stops costing anything and takes effect at
 * once, without a shader recompile in the middle of play.
 */
export function terrainOverlaysFor(map: ENUM_WORLD): readonly TerrainOverlay[] {
  if (!GameOptions.advancedEffects) return NONE;
  return OVERLAYS_BY_WORLD[map] ?? NONE;
}

/** Whether any layer on this map needs the roof mask built. */
export function needsTerrainMask(map: ENUM_WORLD): boolean {
  return terrainOverlaysFor(map).some(o => o.outdoorOnly);
}

/** The per-frame uniforms the overlay path adds: one coverage float per layer. */
export function terrainOverlayUniforms(
  overlays: readonly TerrainOverlay[]
): string[] {
  const names = overlays.map((_, i) => `ovCoverage${i}`);

  // The fire skills' melt patches. Not under `hasRelief`: melting is about a
  // layer's coverage, and a flat layer that declared it would need it too.
  if (hasMelt(overlays)) names.push('ovMeltSpot');

  // Only when something actually has a surface. A map with no relief layer
  // keeps the uniform list it had, which keeps the promise at the top of this
  // file that an unchanged map gets an unchanged shader.
  //
  // `cameraPosition` is on the list because ShaderMaterial binds it only if
  // it is asked for by name; the sheen term needs a view direction.
  if (hasRelief(overlays)) {
    names.push('ovSunDir', 'ovShade', 'ovGrain', 'cameraPosition');
    if (hasTrail(overlays)) names.push('ovTrailOn');
  }

  // Standing water: the same sun and camera, plus the sky colour, the
  // ripple strength and the torch pool.
  if (hasReflect(overlays)) {
    if (!hasRelief(overlays)) names.push('ovSunDir', 'cameraPosition');
    names.push(
      'ovSky',
      'ovSkyHi',
      'ovRipple',
      'ovRain',
      'ovLightPos',
      'ovLightCol'
    );
  }

  return names;
}

function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}

/**
 * Spacing of the finite difference that turns the relief field into a normal,
 * in world units — a tile is 1.
 *
 * Has to sit under the *finest* octave in the field, not the coarsest. At
 * SNOW_COVER's scales the third octave lands at 0.3 * 2.13 * 2.31 = 1.48
 * repeats per tile, a period of 0.68 tiles, so 0.2 gives a little over three
 * samples per period - it under-reads the finest octave's slope slightly and
 * invents nothing.
 *
 * It tracks the drift scale: this was 0.08 while the drifts were a tile
 * across, and a step left too small would resolve detail that is no longer
 * there while costing the same three fetches.
 */
const RELIEF_STEP = 0.2;

/**
 * The ploughed trail, as a shape in the snow (improved_2.jpg).
 *
 * The depth map is 0..1; `TRAIL_DEPTH` is the height, in relief units, the
 * channel floor drops - deeper than any drift, because it goes through them.
 * `TRAIL_LIP` is the heap of shouldered snow raised along the rim: it rides
 * on the map's soft edge (peaks where the map is half deep), so it is a
 * bank on the slope and not a wall on a cliff. `TRAIL_CHURN` is the broken,
 * turned-over snow on the floor. `TRAIL_STEP` is the gradient step for all
 * three - a fifth of the drift step, because a rim is a tenth of a tile.
 */
const TRAIL_DEPTH = 1.6;
const TRAIL_LIP = 0.7;
const TRAIL_CHURN = 0.22;
const TRAIL_STEP = 0.04;
/** How much sky the channel floor loses, on top of the tint the troughs get. */
const TRAIL_AO = 0.18;
/**
 * Slope gain for the trench, in place of `SNOW_SHADE.relief`. The two were
 * one number, which meant flattening the drifts (the reference field is
 * nearly flat) flattened the trench with them. The reference has the
 * opposite: a smooth field cut by hard, shouldered walls.
 */
const TRAIL_GAIN = 2.4;

/**
 * What the ground a melt uncovers is multiplied by at the centre of the patch
 * — `WET_GROUND.colour`, on purpose and to the digit.
 *
 * Snow that a fireball took off the ground did not vanish, it became water,
 * and without this the patch reads as a hole punched in the snow rather than
 * as melt: Devias' bare tiles under its blue bake are a pale cyan (it is why
 * `snowCover`'s BASE_COVER exists at all), so a clean cut to them looks like
 * ice showing through, which is the opposite of what a fire just did. The
 * same multiply the rain uses says "this ground is wet" in the one vocabulary
 * the map already has.
 */
const MELT_DAMP: readonly [number, number, number] = [0.63, 0.65, 0.7];

/**
 * How hard the sun term swings the albedo either side of 1.
 *
 * Deliberately not a second dial. The shading is meant to follow the geometry
 * — a steeper drift catches more light because its normal says so — so this
 * stays fixed and `SNOW_SHADE.relief` moves the slope that feeds it. Two
 * knobs would let the shading and the shape disagree with each other.
 */
const LIT_GAIN = 1.0;

/**
 * The least of its own albedo a drift's shaded face may keep.
 *
 * Two jobs, and the first is not cosmetic: without it the multiplier goes
 * **negative** on a face steep enough and turned far enough from the sun, and
 * a negative albedo is not a dark drift — it is whatever the rest of the
 * pipeline happens to do with a negative colour. A sweep found this at a
 * relief of 1.3 and a gain of 2.2, both inside the range the console hook
 * lets someone dial to.
 *
 * The second is the note from the footprint work: a snow shadow is never
 * black. It is snow lit by the sky instead of the sun, which is why the
 * cavity tint runs after this and why the floor sits well above zero. 0.45
 * landed the darkest face at a little under half the lit one, and with
 * post-processing off that is the dark blue field in the "before" shot;
 * the reference's deepest drift shade measures ~0.72 of the lit snow.
 */
const SHADE_FLOOR = 0.55;

/**
 * What survives in the troughs: skylight, once the warm direct sun is gone.
 *
 * Devias' own blue, not a neutral grey. `DEVIAS_MOOD` in sceneLook grades the
 * map at `shadowsHue: 232` and bakes the terrain at [1.02, 1.08, 1.18], so the
 * map's shadows are already blue-violet; a desaturated `skyGround` grey here
 * was fighting the grade rather than joining it, and read as "dark" instead of
 * as shade. This is hue 232 at half saturation - the same blue the map's own
 * shadows are, so snow in shade matches stone in shade.
 *
 * Baked rather than exposed — it is gated by `SNOW_SHADE.cavity`, so it
 * cannot fail into anything on its own.
 */
// Paler than the 0.66/0.74/0.93 it was: that is the right HUE but at full
// saturation it needs the grade's desaturation (-28 on shadows) to read as
// blue-grey, and with post-processing off it reads as blue paint. Same hue,
// half the chroma, so it lands blue-grey either way; `cavity` was raised to
// keep the same amount of colour in the troughs.
const CAVITY_TINT = 'vec3(0.72, 0.75, 0.83)';

/**
 * Range over which surface detail fades to a flat wash, in world units — a
 * tile is 1.
 *
 * Sized against the game's actual camera, not to taste. The ArcRotateCamera in
 * `testScene` sits at a radius of 10, so ground under the player is about ten
 * tiles away and the far edge of the view is somewhere near thirty. Working
 * that through: the finer relief octave has a period of 0.38 tiles, which at
 * thirty tiles and this obliquity still lands on several pixels, so the noise
 * does not actually alias anywhere the player normally looks.
 *
 * Which makes this insurance rather than a fix, and it is deliberately set
 * where insurance belongs — past everything on screen. A fade that started at
 * sixteen (the first guess here) would have flattened the far half of every
 * shot and put a visible falloff band across the middle of the ground. What
 * it still covers is the pathological case: a wider screen, a zoomed-out
 * view, or ground seen across the map, where the drift really does fall under
 * a pixel and the gradient would turn into shimmer.
 */
/**
 * Repeats of the crystal grain per world unit - a tile is 1.
 *
 * Nine, so a grain feature is about an eighth of a tile: comfortably under a
 * footprint, which is the scale that reads as "this surface is made of
 * something" rather than "someone laid noise over the ground".
 */
const GRAIN_SCALE = 12;

/**
 * How much the ripple is stretched along the wind, as a frequency ratio.
 *
 * Both axes have to stay FINE. Stretching is what makes a ripple, but it also
 * divides the frequency along the wind, and at GRAIN_SCALE 9 a stretch of 0.22
 * put the long axis at 2 repeats per tile - a half-tile feature, which is
 * exactly the mottling scale that was cut two rounds ago for reading as noise
 * laid over the ground. The streaks in play were a tile long and smeared.
 *
 * Raising the scale and easing the stretch keeps the ripple and takes the long
 * axis back under a print: 20 * 0.35 = 7 repeats per tile, a feature every
 * 0.14 tiles, against 20 across at 0.05.
 */
const GRAIN_STRETCH = 0.35;

/**
 * Roughness of the sheen lobe along the wind and across it.
 *
 * Both far broader than the pow(NdotH, 42) they replaced - that exponent is
 * about a 0.15 lobe, isotropic, which is a wet surface and not a dry one. Snow
 * is rough; what makes it read as snow rather than as ice is that the
 * highlight is a smeared band along the ripples, not a point.
 */
const SHEEN_ALONG = 0.62;
const SHEEN_ACROSS = 0.2;

/** Glitter cells per world unit, and how few of them fire. */
const GLITTER_SCALE = 150;
const GLITTER_RARITY = 0.978;

/** How bright a firing crystal is against the sheen it sits on. */
const GLITTER_GAIN = 3;

/** The wind's axis. Deliberately off both world axes so it cannot read as the tile grid. */
const WIND_COS = 0.819;
const WIND_SIN = 0.574;

/** Finite-difference step for the grain. Its own, matched to its own period. */
const GRAIN_STEP = 0.014;

/**
 * Range over which the grain fades out, in world units.
 *
 * Much shorter than the drifts' fade, and for the reason that fade exists at
 * all: a 0.11-tile feature falls under a pixel far closer to the camera than a
 * 3-tile one does, and past that point it contributes nothing but shimmer.
 */
const GRAIN_NEAR = 10;
const GRAIN_FAR = 26;

const DETAIL_NEAR = 30;
const DETAIL_FAR = 55;

/**
 * The fragment-shader body. Returns '' when the map has no layers, so the
 * unchanged shader is genuinely unchanged.
 *
 * `finalColorVar` is the albedo the caller has already resolved from the splat
 * layers; each layer is applied to it in place, in list order.
 *
 * `openVar` is a float already in scope: 1 for open sky, 0 for roofed.
 */
export function terrainOverlayGlsl(
  overlays: readonly TerrainOverlay[],
  finalColorVar: string,
  openVar: string
): string {
  if (overlays.length === 0) return '';

  const blocks = overlays.map((o, i) => {
    const c = o.colour;
    const blended =
      o.blend === 'multiply'
        ? `${finalColorVar}.rgb * vec3(${f(c[0])}, ${f(c[1])}, ${f(c[2])})`
        : `vec3(${f(c[0])}, ${f(c[1])}, ${f(c[2])})`;

    const grain = o.grain ?? 0;
    const grainScale = o.grainScale ?? 1;

    // A relief layer takes its albedo wobble from the surface it already has,
    // inside the relief block below. Two reasons: the separate grain noise was
    // value noise, so it was contributing its own quilting to the thing this
    // change exists to fix; and a snowfield's bright and dull patches are the
    // drifts, not an unrelated field laid over them.
    const grainGlsl =
      grain > 0 && !o.relief
        ? `
      // Surface of the layer itself: two octaves of the same noise, as a
      // brightness wobble either side of 1. Drifts, not patches.
      float ovG${i} =
          overlayNoise(vWorldXZ * ${f(grainScale)}) * 0.6 +
          overlayNoise(vWorldXZ * ${f(grainScale * 3.1)}) * 0.4;
      ovCol${i} *= 1.0 + ${f(grain)} * (ovG${i} - 0.5) * 2.0;
`
        : '';

    // The surface of the layer, and every term that hangs off it. Emitted
    // only for a layer that declares relief, so the wet-weather layers keep
    // the exact shader they had.
    const reliefGlsl = !o.relief
      ? ''
      : `
      // ---- the layer's own surface ---------------------------------------
      //
      // Depth, which is not ovAmount. Amount saturates once the ground has
      // gone white; depth keeps climbing past that, and the gap between the
      // two is the difference between "the ground is white here" and "there
      // is a drift here". Deepest where the break-up noise is low, which is
      // where snow collects.
      float ovDepth${i} = ovAmount${i} * clamp(
        0.35 + (ovTarget${i} - ovBreakup${i}) + ovShade.w, 0.0, 1.0);

      float ovHc${i} = ovRelief${i}(vWorldXZ);

      // Albedo wobble, off the surface rather than off a field of its own.
      ovCol${i} *= 1.0 + ${f(o.grain ?? 0)} * (ovHc${i} - 0.5) * 2.0;
      float ovHx${i} = ovRelief${i}(vWorldXZ + vec2(${f(RELIEF_STEP)}, 0.0));
      float ovHz${i} = ovRelief${i}(vWorldXZ + vec2(0.0, ${f(RELIEF_STEP)}));

      // Gradient of that field, as a surface normal, blended toward the
      // ground's own by depth: a dusting follows the terrain, a drift has a
      // shape of its own.
      //
      // The blend treats the bump as if the ground were level and so
      // under-rotates on a slope. Affordable because slopeKnee fades the
      // layer out well before the ground is steep enough for that to show.
      // Procedural noise has no mip chain, so past the distance at which a
      // drift is narrower than a pixel the gradient stops being a surface and
      // becomes shimmer. Fade the *detail* out with range while leaving depth
      // alone, because depth also decides coverage and distant snow should
      // still be snow - just flat snow, which is what it was before this
      // existed and is exactly what it should degrade to.
      //
      // This also carries the failure mode for cameraPosition: unbound it
      // reads as the origin, the distance becomes the fragment's own distance
      // from world zero, and every terrain fragment on a 256-tile map lands
      // past the far end of the fade. An unbound uniform switches the feature
      // off rather than lighting the map from an arbitrary place.
      vec3 ovEye${i} = cameraPosition - vWorldPos;
      float ovDetail${i} = ovDepth${i} *
        (1.0 - smoothstep(${f(DETAIL_NEAR)}, ${f(DETAIL_FAR)}, length(ovEye${i})));

      float ovGain${i} = ovShade.x * ${f(o.relief)} / ${f(RELIEF_STEP)};

      // Crystal grain, on its own step because it is on its own scale. Fades
      // out far sooner than the drifts do: a 0.11-tile feature falls under a
      // pixel much closer to the camera than a 3-tile one, and past that point
      // it stops being texture and starts being shimmer.
      float ovGc${i} = ovGrainAt${i}(vWorldXZ);
      float ovGx${i} = ovGrainAt${i}(vWorldXZ + vec2(${f(GRAIN_STEP)}, 0.0));
      float ovGz${i} = ovGrainAt${i}(vWorldXZ + vec2(0.0, ${f(GRAIN_STEP)}));
      float ovGg${i} = ovGrain * ovDepth${i} / ${f(GRAIN_STEP)} *
        (1.0 - smoothstep(${f(GRAIN_NEAR)}, ${f(GRAIN_FAR)}, length(ovEye${i})));

      // The ploughed trail: its own gradient step, because a rim is far
      // finer than a drift, scaled by the drift gain so the channel walls
      // are lit by exactly the rule the drift faces are. Gated on amount,
      // not detail - a trail is a shape in the snow at any distance.
      float ovTc${i} = 0.0;
      float ovTgx${i} = 0.0;
      float ovTgz${i} = 0.0;
      float ovTd${i} = 0.0;
${
        o.trail
          ? `
      ovTd${i} = ovTrailAt${i}(vWorldXZ) * ovAmount${i};
      if (ovTd${i} > 0.0) {
        ovTc${i} = ovTrailShape${i}(vWorldXZ);
        float ovTg${i} = ${f(TRAIL_GAIN)} / ${f(TRAIL_STEP)} * ovAmount${i};
        ovTgx${i} = (ovTrailShape${i}(vWorldXZ + vec2(${f(TRAIL_STEP)}, 0.0)) - ovTc${i}) * ovTg${i};
        ovTgz${i} = (ovTrailShape${i}(vWorldXZ + vec2(0.0, ${f(TRAIL_STEP)})) - ovTc${i}) * ovTg${i};
      }`
          : ''
      }

      vec3 ovBump${i} = normalize(vec3(
        -(ovHx${i} - ovHc${i}) * ovGain${i} - (ovGx${i} - ovGc${i}) * ovGg${i} - ovTgx${i},
        1.0,
        -(ovHz${i} - ovHc${i}) * ovGain${i} - (ovGz${i} - ovGc${i}) * ovGg${i} - ovTgz${i}
      ));
      // The snow's own normal, built WITHOUT reference to vNormal.
      //
      // The mix that used to be here dragged the terrain's normal into the
      // snow's lighting, and that normal is flat per tile: the ground is a
      // quad soup with four unshared vertices each, so every tile is a facet.
      // Under a texture nobody notices; under a smooth white layer the facets
      // become the dominant structure and the snowfield reads as a grid of
      // slightly different squares - a large part of what kept coming back as
      // "pixelated". The bake still carries the terrain's real shape, which is
      // where that belongs.
      float ovNmix${i} = max(ovDetail${i}, ovTd${i});
      vec3 ovN${i} = normalize(vec3(
        ovBump${i}.x * ovNmix${i},
        1.0,
        ovBump${i}.z * ovNmix${i}
      ));

      // Sun on that normal, folded into the albedo rather than added after
      // the fact, so the drift is still cut by the cascades and still coloured
      // by the map's own bake - a drift in the shade of a wall is a shaded
      // drift. That is the whole reason this belongs in the terrain shader and
      // not in a decal.
      //
      // What shades is the DEVIATION from the ground's own normal, not the
      // absolute dot product. Two reasons, and the first one is why the drifts
      // did not show up at all on the first attempt:
      //
      //  - On near-level ground dot(vNormal, sun) is about 0.81 and the
      //    perturbation is worth about 0.09 either side of it. An absolute
      //    term therefore spends nine tenths of its range on a constant and
      //    one tenth on the shape it exists to show. Centring it hands the
      //    whole range to the shape.
      //  - The constant part is a flat brightening of every snow fragment,
      //    which is the bake's job and not this term's. Worse, it disappears
      //    at the far end of the detail fade, so distant snow would read
      //    dimmer than near snow with a visible band between them.
      // Centred on level ground rather than on vNormal, for the same reason.
      float ovNdl${i} = dot(ovN${i}, ovSunDir) - ovSunDir.y;
      ovCol${i} *= max(
        1.0 + ${f(LIT_GAIN)} * ovNdl${i} * ovSunOn * ovNmix${i},
        ${f(SHADE_FLOOR)});

      // Troughs between drifts lose sky. What they lose is the warm direct
      // sun, so what is left is cooler than the lit face - a tint rather than
      // a plain darkening, which is the same reasoning as the footprints'
      // cavity colour and keeps the two agreeing on one map.
      // Only the genuine troughs. The band used to open at 0.2, which is most
      // of a field whose height runs 0..1 - so the tint was washing over
      // roughly half the snow instead of sitting in the hollows of it.
      float ovCav${i} = max(
        (1.0 - smoothstep(0.42, 0.95, ovHc${i})) * ovDetail${i},
        smoothstep(0.2, 0.8, ovTd${i}));
      // The channel floor sees less sky than any trough between drifts.
      ovCol${i} *= 1.0 - ${f(TRAIL_AO)} * smoothstep(0.3, 1.0, ovTd${i});
      ovCol${i} *= mix(
        vec3(1.0), ${CAVITY_TINT}, clamp(ovShade.y * ovCav${i}, 0.0, 1.0));

      // Sheen, in two parts, because snow scatters at two scales at once.
      //
      // The first version of this was a single tight pow(NdotH, 42), and
      // that is precisely the "polished glass" read: an isotropic lobe that
      // narrow puts ONE sharp highlight on a surface which in reality throws
      // light along its ripples. Snow is rough and directional, and the lobe
      // has to be too.
      vec3 ovView${i} = normalize(ovEye${i});
      vec3 ovHalf${i} = normalize(ovView${i} + ovSunDir);

      // Ward-style anisotropic lobe about the wind axis: broad ALONG the
      // ripple, tight across it. Same axis the grain is stretched on, so the
      // sheen elongates in the direction the surface actually runs.
      vec3 ovWindT${i} = normalize(vec3(${f(WIND_COS)}, 0.0, ${f(WIND_SIN)}));
      vec3 ovWindB${i} = normalize(cross(ovN${i}, ovWindT${i}));
      float ovHt${i} = dot(ovHalf${i}, ovWindT${i});
      float ovHb${i} = dot(ovHalf${i}, ovWindB${i});
      float ovHn${i} = max(dot(ovHalf${i}, ovN${i}), 0.0001);
      float ovWard${i} = exp(-(
        ovHt${i} * ovHt${i} / ${f(SHEEN_ALONG * SHEEN_ALONG)} +
        ovHb${i} * ovHb${i} / ${f(SHEEN_ACROSS * SHEEN_ACROSS)}
      ) / (ovHn${i} * ovHn${i}));

      // Glitter: individual crystals catching the sun, and the reason they
      // twinkle is that each one is tilted its own way. A sparse hash picks
      // which cells fire and a second pair gives each its OWN micro-normal, so
      // a glint lights only while the half-vector happens to meet that facet -
      // it comes and goes as the camera moves. Firing them all off the surface
      // normal, as the earlier cut did, just puts static white dots on the
      // ground.
      vec2 ovCell${i} = floor(vWorldXZ * ${f(GLITTER_SCALE)});
      vec3 ovFacet${i} = normalize(vec3(
        overlayHash(ovCell${i} + 3.1) - 0.5,
        0.55,
        overlayHash(ovCell${i} + 7.7) - 0.5
      ));
      float ovGlint${i} =
        step(${f(GLITTER_RARITY)}, overlayHash(ovCell${i})) *
        pow(max(dot(ovFacet${i}, ovHalf${i}), 0.0), 90.0);

      // Both gated on ovSunOn - an unbound sun direction must not be allowed
      // to put a highlight in an arbitrary place.
      ovCol${i} += vec3(ovWard${i} + ovGlint${i} * ${f(GLITTER_GAIN)}) *
                   ovShade.z * ovSunOn * ovDetail${i};

      // Thin snow settles INTO the ground's texture instead of hiding it,
      // which is what lets paving read through at the fringe rather than the
      // layer stopping at a clean edge. Last, so everything above sees the
      // unmodulated amount.
      //
      // The blend runs on a SMOOTHSTEP of depth, not on depth itself, and the
      // difference matters more than it looks. Against raw depth the term
      // never quite reaches 1: at full coverage depth still sits around 0.65
      // in places, which left up to a sixth of the ground texture showing
      // through a snowfield that should have been opaque. The ground texture
      // is a tile magnified across several world units, so what came through
      // was not a hint of stone - it was visible texels. Reaching 1 by a
      // depth of 0.45 confines this to genuinely thin snow, which is the only
      // place it was ever meant to fire.
      ovAmount${i} = clamp(
        ovAmount${i} * mix(
          0.3 + 1.2 * ovHc${i}, 1.0, smoothstep(0.0, 0.45, ovDepth${i})),
        0.0, 1.0);
`;

    // The fire skills' melt patches (weather/snowMelt.ts). Branchless: an
    // empty slot carries strength 0, so it contributes nothing to the `max`
    // and the loop costs the same whatever is burning. `length()` of a vec2
    // per slot on a six-slot array is well inside what the ground can spend.
    const meltGlsl = !o.melt
      ? ''
      : `
      float ovMelt${i} = 0.0;
      for (int m = 0; m < ${MELT_SPOTS}; m++) {
        float ovMr${i} = max(ovMeltSpot[m].z, 0.001);
        float ovMd${i} = length(vWorldXZ - ovMeltSpot[m].xy) / ovMr${i};
        ovMelt${i} = max(
          ovMelt${i},
          ovMeltSpot[m].w * (1.0 - smoothstep(${f(MELT_EDGE)}, 1.0, ovMd${i})));
      }
`;

    // The uncovered ground, damped as wet. AFTER the layer mix, so it is the
    // GROUND being wetted and not the snow: at the rim of a patch the two
    // overlap and the snow there should still read as snow.
    const meltDampGlsl = !o.melt
      ? ''
      : `
      ${finalColorVar}.rgb *= mix(
        vec3(1.0),
        vec3(${f(MELT_DAMP[0])}, ${f(MELT_DAMP[1])}, ${f(MELT_DAMP[2])}),
        ovMelt${i});`;

    return `
    // Layer ${i}: ${o.name} (${o.blend}) - see terrainOverlay.ts.
    if (ovCoverage${i} > 0.0) {
      // Two octaves of value noise decide WHERE the layer lands. Thresholding
      // it against the coverage is what makes the layer creep outward from
      // patches as it builds, instead of the whole ground fading up together.
      vec2 ovP${i} = vWorldXZ * ${f(o.patchScale)};
      float ovBreakup${i} =
          overlayNoise(ovP${i}) * 0.65 + overlayNoise(ovP${i} * 2.7) * 0.35;
${meltGlsl}
      // Melt divides the TARGET, not the finished amount: everything the
      // layer has - its coverage, its depth, the drifts' relief and lighting,
      // any trail ploughed through it - hangs off this one number, so taking
      // it down here is the difference between snow that was burned away and
      // snow that has been painted over.
      float ovTarget${i} =
          ovCoverage${i} * ${f(1 + (o.headroom ?? 0))} * ${
      o.outdoorOnly ? openVar : '1.0'
    } * ovFlat(${f(o.slopeKnee)}, ${f(o.slopeTop ?? 1)})${o.bed ? ` * ovBedHere${i}` : ''}${
      o.melt ? ` * (1.0 - ovMelt${i})` : ''
    };

      float ovAmount${i} = smoothstep(
        ovBreakup${i} - ${f(o.softness)},
        ovBreakup${i} + ${f(o.softness)},
        ovTarget${i}
      );

      vec3 ovCol${i} = ${blended};
${grainGlsl}${reliefGlsl}
      ${finalColorVar}.rgb = mix(${finalColorVar}.rgb, ovCol${i}, ovAmount${i});${meltDampGlsl}${
      o.reflect
        ? `
      ovWater = max(ovWater, ovAmount${i});`
        : ''
    }${
      o.lightNeutral
        ? `
      ovNeutral = max(ovNeutral, ovAmount${i} * ${f(o.lightNeutral)});`
        : ''
    }
    }`;
  });

  // How much of this fragment's light the layers take over. Declared here,
  // outside the per-layer blocks, because the material's final lighting
  // line reads it (terrainOverlayLitGlsl).
  const neutralDecl = hasLightNeutral(overlays)
    ? '    float ovNeutral = 0.0;\n'
    : '';

  // Zero when the sun direction never reached the GPU. Every relief term is
  // multiplied by it, so the feature collapses to the flat wash this file drew
  // before it existed — the same rule the coverage uniforms follow: a uniform
  // that fails must fail to "feature off", never to something worse than not
  // having the feature at all.
  const prelude =
    (hasRelief(overlays) || hasReflect(overlays)
      ? '    float ovSunOn = step(0.5, dot(ovSunDir, ovSunDir));\n'
      : '') +
    // How much standing water is under this fragment, read after lighting
    // by terrainOverlayReflectGlsl. Declared outside the layer blocks.
    (hasReflect(overlays) ? '    float ovWater = 0.0;\n' : '');

  // Bed share under this fragment, for each layer that has a table. Reads
  // main()'s own locals - the tile indices and the layer-2 alpha the ground
  // was just drawn with - so it lives here rather than in a function.
  const bedHere = overlays
    .map((o, i) =>
      o.bed
        ? `    float ovBedHere${i} = mix(ovBed${i}(int(m1)), ovBed${i}(int(m2)), alphaRendered ? vAlphaColor.a : 0.0);\n`
        : ''
    )
    .join('');

  return neutralDecl + bedHere + prelude + blocks.join('\n');
}

/** Whether any layer replaces the map's baked light. Allocation-free. */
function hasLightNeutral(overlays: readonly TerrainOverlay[]): boolean {
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].lightNeutral) return true;
  }
  return false;
}

/**
 * The lighting term the terrain material multiplies its colour by, with the
 * layers' share of it taken over. Emits `vec3 <outVar> = <mapLitExpr>;` and,
 * only when a layer asks for it, a mix toward the layer's own light:
 *
 *   white where the bake is bright and the sun reaches, OVERLAY_LIGHT.shadow
 *   where either is cut. The bake contributes its luminance only — its hue
 *   is the map's grade, and the whole point is that snow does not take it.
 *
 * `bakeVar` is the lightmap colour (0…1), `sunVar` the cascaded sun factor
 * (1 = lit), `extraExpr` the light that applies to ground and layer alike
 * (torches, room key). Must run after `terrainOverlayGlsl`.
 */
export function terrainOverlayLitGlsl(
  overlays: readonly TerrainOverlay[],
  outVar: string,
  mapLitExpr: string,
  bakeVar: string,
  sunVar: string,
  extraExpr: string
): string {
  if (!hasLightNeutral(overlays)) return `    vec3 ${outVar} = ${mapLitExpr};`;
  const s = OVERLAY_LIGHT.shadow;
  const l = OVERLAY_LIGHT.lit;
  return `
    vec3 ${outVar} = ${mapLitExpr};
    {
      float ovBakeLum = dot(${bakeVar}.rgb, vec3(0.299, 0.587, 0.114));
      float ovKey = smoothstep(0.0, 1.0, ovBakeLum * ${f(OVERLAY_LIGHT.gain)}) * ${sunVar};
      vec3 ovLayerLit =
        min(
          mix(vec3(${f(s[0])}, ${f(s[1])}, ${f(s[2])}),
              vec3(${f(l[0])}, ${f(l[1])}, ${f(l[2])}), ovKey) + ${extraExpr},
          vec3(${f(OVERLAY_LIGHT.cap)}));
      ${outVar} = mix(${outVar}, ovLayerLit, ovNeutral);
    }`;
}

/**
 * Declarations the overlay body needs. Kept apart from the body so they can sit
 * at file scope in the shader, where GLSL wants functions.
 */
export function terrainOverlayDeclarationsGlsl(
  overlays: readonly TerrainOverlay[]
): string {
  if (overlays.length === 0) return '';

  const uniforms = [
    ...overlays.map((_, i) => `  uniform float ovCoverage${i};`),
    // vec4(worldX, worldZ, radius, strength) per patch; strength 0 = no patch.
    ...(hasMelt(overlays)
      ? [`  uniform vec4 ovMeltSpot[${MELT_SPOTS}];`]
      : []),
  ].join('\n');

  // Three more, and only when a layer has a surface. `cameraPosition` is
  // Babylon's own name — ShaderMaterial fills it in for us once it is on the
  // uniform list, which is why terrainOverlayUniforms asks for it there.
  const reliefUniforms = [
    ...(hasRelief(overlays) || hasReflect(overlays)
      ? ['  uniform vec3 ovSunDir;', '  uniform vec3 cameraPosition;']
      : []),
    ...(hasRelief(overlays)
      ? [
          '  uniform vec4 ovShade;',
          '  uniform float ovGrain;',
          ...(hasTrail(overlays)
            ? ['  uniform sampler2D ovTrail;', '  uniform float ovTrailOn;']
            : []),
        ]
      : []),
    ...(hasReflect(overlays)
      ? [
          '  uniform vec3 ovSky;',
          '  uniform vec3 ovSkyHi;',
          '  uniform float ovRipple;',
          '  uniform float ovRain;',
          `  uniform vec4 ovLightPos[${REFLECT_LIGHTS}];`,
          `  uniform vec3 ovLightCol[${REFLECT_LIGHTS}];`,
        ]
      : []),
  ].join('\n');

  // Gradient noise, and the reason it exists next to overlayNoise rather than
  // replacing it. (Octave weights are set in the relief function below.)
  //
  // Value noise interpolates a random number per lattice point, so its
  // features line up with the lattice and it reads as soft squares - fine for
  // deciding WHERE a patch of snow lands, where nobody looks at the shape of
  // the boundary, and badly wrong for a surface whose gradient is about to be
  // turned into a normal and lit. On screen the first version of this came out
  // visibly quilted. Gradient noise interpolates a random *direction* instead
  // and has no such alignment.
  //
  // Kept as a second function rather than an upgrade to overlayNoise so the
  // wet-weather layers keep the exact shader they had.
  const gradientNoise = hasRelief(overlays) || hasReflect(overlays)
    ? `
  vec2 ovGrad(vec2 i) {
    // Two hashes into a direction. No trig: normalize of a square-distributed
    // pair is cheaper than a sin/cos pair and the slight bias toward the
    // diagonals disappears once the octaves are summed. The epsilon keeps
    // normalize away from a zero vector on the one lattice point where both
    // hashes land on 0.5.
    vec2 g = vec2(overlayHash(i), overlayHash(i + 17.17)) * 2.0 - 1.0;
    return g / max(length(g), 0.0001);
  }

  float ovGnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(ovGrad(i), f);
    float b = dot(ovGrad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(ovGrad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(ovGrad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.7 + 0.5;
  }`
    : '';

  // Raindrop rings on the standing water. See the RING_* block for what the
  // numbers are; this is the shape.
  //
  // Returned as a SLOPE, not a height, and computed analytically: for a
  // radial profile h(d) the gradient is h'(d) * normalize(p - centre), so the
  // ring never has to be sampled three times to be differenced. That is the
  // whole reason drop rings can sit in the same fragment as the wind ripple
  // without doubling its cost.
  const ringField = hasReflect(overlays)
    ? `
  vec2 ovRingGrad(vec2 p, float t, float salt, float density) {
    vec2 cell = floor(p);

    // Each cell keeps its own phase, so the field does not pulse in unison.
    float k = t / ${f(RING_PERIOD)} + overlayHash(cell + salt);
    float period = floor(k);
    float u = k - period;

    // Re-rolled every period: whether this cell carries a drop at all, and
    // where in the cell it lands. Without the re-roll the same cells would
    // ring forever and the density could not follow the rain.
    vec2 id = cell + vec2(period * 37.0 + salt, period * 17.0 - salt);
    if (overlayHash(id) > density) return vec2(0.0);

    vec2 c = cell + vec2(0.3) +
      0.4 * vec2(overlayHash(id + 5.5), overlayHash(id + 9.1));
    vec2 d = p - c;
    float r = length(d);
    if (r < 0.0001) return vec2(0.0);

    // Signed distance from the crest, in crest widths. Compact support: one
    // trough and one crest, nothing outside |x| < 1, which is what keeps the
    // ring inside its own cell.
    float front = u * ${f(RING_MAX)};
    float x = (r - front) / ${f(RING_WIDTH)};
    if (abs(x) >= 1.0) return vec2(0.0);

    // h(x) = sin(pi x) (1 - x^2); the derivative is the product rule of it.
    float w = 1.0 - x * x;
    float dh = (3.14159265 * cos(3.14159265 * x) * w -
      2.0 * x * sin(3.14159265 * x)) / ${f(RING_WIDTH)};

    // Flattens as it spreads, and is gone before the cell edge.
    float amp = (1.0 - u) * (1.0 - u) *
      (1.0 - smoothstep(${f(RING_FADE)}, ${f(RING_MAX)}, r));

    return (d / r) * dh * amp;
  }`
    : '';

  // The height of a relief layer's own surface, 0..1.
  //
  // Three octaves, each ROTATED off the last. Rotation is the other half of
  // the fix: octaves stacked on the same axes put their lattices on top of
  // each other and the alignment survives however many you add. 0.8/0.6 is a
  // 37-degree turn, which shares no axis with the ones either side of it.
  const reliefFns = overlays
    .map((o, i) => {
      if (!o.relief) return '';
      const scale = o.reliefScale ?? 1;
      return `
  // Layer ${i} crystal grain: ONE octave, far finer than the drift field, and
  // deliberately kept out of ovRelief so the drift's gradient step does not
  // have to resolve it. Sampling a 0.11-tile period with the drift's 0.2 step
  // would measure nothing but its own aliasing.
  //
  // ANISOTROPIC, and that is the point of it. Undisturbed powder is not
  // covered in round specks - the wind works it into ripples, long in the
  // direction it blew and tight across, and that streaking is most of what
  // separates a snowfield from a noisy white surface. Rotating into the wind
  // axis and then sampling at two very different frequencies gets it for the
  // cost of a 2x2 multiply: low frequency along the wind stretches a feature
  // out, high frequency across it keeps the ripple tight.
  float ovGrainAt${i}(vec2 p) {
    vec2 w = vec2(
      p.x * ${f(WIND_COS)} - p.y * ${f(WIND_SIN)},
      p.x * ${f(WIND_SIN)} + p.y * ${f(WIND_COS)}
    );
    return ovGnoise(vec2(
      w.x * ${f(GRAIN_SCALE * GRAIN_STRETCH)},
      w.y * ${f(GRAIN_SCALE)}
    ));
  }

  float ovRelief${i}(vec2 p) {
    vec2 q = p * ${f(scale)};
    float n = ovGnoise(q) * 0.66;
    q = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) * 2.13;
    n += ovGnoise(q) * 0.23;
    q = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) * 2.31;
    return n + ovGnoise(q) * 0.11;
  }${
        o.trail
          ? `
  // Depth of the ploughed trail under p, 0..1. Same addressing as the
  // dynamic light map: texel centres on integer tiles.
  float ovTrailAt${i}(vec2 p) {
    return texture2D(ovTrail, (p + 0.5) / 256.0).r * ovTrailOn;
  }

  // The trail as a height, in the relief's units: the channel cut down,
  // the rim heaped up along its soft edge, the floor churned.
  float ovTrailShape${i}(vec2 p) {
    float d = ovTrailAt${i}(p);
    // The wall: most of the drop happens over the middle of the ramp, so
    // the channel has a flat floor, a near-vertical side and a flat top,
    // which is what the reference's cut-out edge is.
    float wall = smoothstep(0.12, 0.6, d);
    // The heap of shouldered snow, on the outer shoulder where the depth is
    // still small: a bank raised just outside the cut, not a bump on it.
    float rim = smoothstep(0.0, 0.18, d) * (1.0 - smoothstep(0.18, 0.45, d));
    float churn = (ovGnoise(p * 6.5) - 0.5) * 2.0 * smoothstep(0.5, 0.95, d);
    return -wall * ${f(TRAIL_DEPTH)} + rim * ${f(TRAIL_LIP)} +
           churn * ${f(TRAIL_CHURN)};
  }`
          : ''
      }`;
    })
    .join('');

  // The bed table, as a lookup by tile index. An if-chain rather than a
  // const array: GLSL ES 1.00 cannot index a const array by a runtime
  // value, and the terrain shader still has to compile there.
  //
  // The two mapping layers are mixed by the same per-vertex alpha the tile
  // textures are, so the layer thins across a painted path exactly where
  // the path texture fades in. `m1`, `m2`, `alphaRendered` and `vAlphaColor`
  // are the terrain shader's own; this is inlined into its main().
  const bedFns = overlays
    .map((o, i) => {
      if (!o.bed) return '';
      const chain = Object.entries(o.bed)
        .map(([t, s]) => `    if (t == ${t}) return ${f(s)};`)
        .join('\n');
      return `
  float ovBed${i}(int t) {
${chain}
    return ${f(o.bedDefault ?? 1)};
  }`;
    })
    .join('');

  return `
${uniforms}
${reliefUniforms}
${bedFns}

  // Every caller of this hashes an INTEGER: the noise lattice hashes
  // floor(p), and the glitter hashes floor(worldXZ * scale). The hash that
  // used to be here could not survive that.
  //
  //     p = fract(p * vec2(127.1, 311.7));
  //
  // For integer x, fract(127.1 * x) is fract(0.1 * x) - ten values, and the
  // same ten for y. So the final mix only ever saw a 10x10 grid of inputs.
  // Measured over a 300x300 patch of lattice: 55 DISTINCT OUTPUTS out of
  // 90000 points, and not one of them above 0.978.
  //
  // Two consequences, both of which had been costing us for a while. Every
  // noise field here - patch placement, drifts, grain - was drawing its values
  // from a set of 55, which is a repeating pattern wearing a noise function's
  // clothes. And any threshold up in the tail, which is how sparse effects
  // like glitter are selected, could never fire at all: it was dead code from
  // the day it was written.
  //
  // This is Hoskins' hash21. On the same lattice: 86136 distinct outputs of
  // 90000, and 2.15% above 0.978 against the 2.2% a uniform hash owes.
  float overlayHash(vec2 p) {
    vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float overlayNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(overlayHash(i), overlayHash(i + vec2(1.0, 0.0)), f.x),
      mix(overlayHash(i + vec2(0.0, 1.0)), overlayHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // How level this fragment is, against a layer's slope limit.
  // Full by top, not by 1.0: the ground normal is flat per tile, so a
  // ramp that only saturates on dead-level ground leaves every mildly
  // sloped tile half-covered - hard tile-shaped holes across a hillside.
  float ovFlat(float knee, float top) {
    return smoothstep(knee, top, clamp(vNormal.y, 0.0, 1.0));
  }
${gradientNoise}
${ringField}
${reliefFns}
  `;
}

/** Per-frame uniform upload. The coverage drivers are read here and nowhere else. */
export function bindTerrainOverlays(
  effect: Effect,
  overlays: readonly TerrainOverlay[],
  scene: Scene
): void {
  // Zero coverage is the shader's "no layer" path, so an overlay compiled in
  // before the option was switched off simply stops drawing.
  const on = GameOptions.advancedEffects;

  for (let i = 0; i < overlays.length; i++) {
    const k = on ? overlays[i].coverage() : 0;
    effect.setFloat(
      `ovCoverage${i}`,
      // NaN out of a driver would poison the mix and paint the ground black;
      // the comparison is false for NaN, so this floors it at zero.
      k > 0 ? Math.min(1, k) : 0
    );
  }

  // Before the relief early-out: melting is a coverage term, and a layer that
  // declared it without a surface would still need its patches.
  if (hasMelt(overlays)) {
    effect.setArray4('ovMeltSpot', snowMeltUniform(on));
  }

  if (hasReflect(overlays)) bindReflect(effect, overlays, scene, on);

  if (!hasRelief(overlays)) return;

  const sun = sunDirection(scene);
  effect.setFloat3('ovSunDir', sun.x, sun.y, sun.z);

  if (hasTrail(overlays)) {
    effect.setTexture('ovTrail', snowTrailTexture(scene));
    effect.setFloat('ovTrailOn', on && snowTrailPainted() ? 1 : 0);
  }

  // Every one of these is a term that contributes nothing at zero, so the
  // advanced-effects switch turns the surface off by handing over zeroes and
  // the layer falls back to the flat wash — no recompile, no reload.
  effect.setFloat('ovGrain', on ? SNOW_SHADE.grain : 0);
  effect.setFloat4(
    'ovShade',
    on ? SNOW_SHADE.relief : 0,
    on ? SNOW_SHADE.cavity : 0,
    on ? SNOW_SHADE.sheen : 0,
    on ? SNOW_SHADE.depth : 0
  );
}

/**
 * Standing water's reflections, emitted AFTER the lighting so the water can
 * add light the ground under it never had: a Fresnel share of a built sky,
 * the sun's halo and glint, and each nearby torch as a pin-point glint over
 * a soft glow. Reads `ovWater` (set in the layer block) and `vNormal`,
 * `vWorldPos`; the caller names the lit colour and its sun-shadow factor.
 *
 * Two things happen here, and they are the same thing seen twice.
 *
 * **The normal is water, not ground.** Three fields stack into it: two
 * scrolling octaves of gradient noise for the wind ripple, tilted by
 * `ovRipple`, and — new — the rings of individual raindrops landing on the
 * pool (`ovRingGrad`). Still water is a mirror; in a shower the rings
 * shiver everything it is showing, which is what makes it read as rain ON
 * water instead of a wet decal beside falling rain.
 *
 * **What it reflects is a sky, not a colour.** The mirrored view ray picks a
 * point on a horizon-to-zenith gradient and on a drifting cloud deck above
 * it (see the SKY_/CLOUD_ block). That gradient runs across every pool and
 * moves with the camera, and it is the whole difference between water and a
 * dark patch of paint — the flat `ovSky` wash this had before was, correctly,
 * read as "a texture given to them".
 */
export function terrainOverlayReflectGlsl(
  overlays: readonly TerrainOverlay[],
  colorVar: string,
  sunShadowVar: string
): string {
  if (!hasReflect(overlays)) return '';

  // One recipe's numbers: the first reflecting layer. Maps carry one.
  const o = overlays.find(l => l.reflect)!;
  const r = o.reflect!;

  return `
    // ---- standing water (terrainOverlayReflectGlsl) ---------------------
    if (ovWater > 0.0 && ovSunOn > 0.0) {
      vec3 ovV = normalize(cameraPosition - vWorldPos);

      vec2 ovRp = vWorldXZ * ${f(RIPPLE_SCALE)};
      vec2 ovR1 = ovRp + vec2(time * 0.7, time * 0.45);
      vec2 ovR2 = ovRp * 2.3 + vec2(-time * 1.1, time * 0.8);
      float ovRh = ovGnoise(ovR1) + 0.5 * ovGnoise(ovR2);
      float ovRhx = ovGnoise(ovR1 + vec2(${f(RIPPLE_STEP * RIPPLE_SCALE)}, 0.0)) +
        0.5 * ovGnoise(ovR2 + vec2(${f(RIPPLE_STEP * RIPPLE_SCALE * 2.3)}, 0.0));
      float ovRhz = ovGnoise(ovR1 + vec2(0.0, ${f(RIPPLE_STEP * RIPPLE_SCALE)})) +
        0.5 * ovGnoise(ovR2 + vec2(0.0, ${f(RIPPLE_STEP * RIPPLE_SCALE * 2.3)}));
      // The gradient is already Δh over one step of the field; dividing by
      // the raw step here scaled it ~17x and tipped every normal nearly
      // horizontal - the whole pool lit up as mottled foil (the "flood"
      // screenshot). 3.0 puts the slope at ~0.3 with full rain on a
      // ripple-0.35 recipe: shivering glints, readable water.
      float ovRk = ovRipple * 3.0;
      vec2 ovSlope = vec2(-(ovRhx - ovRh) * ovRk, -(ovRhz - ovRh) * ovRk);

      // The rain landing on the pool. Two ring layers at cell sizes that
      // share no multiple, so the lattice of neither is visible.
      if (ovRain > 0.0) {
        float ovDensity = min(1.0, ovRain * ${f(RING_DENSITY_GAIN)});
        vec2 ovRingP = vWorldXZ * ${f(RING_SCALE)};
        vec2 ovRings =
          ovRingGrad(ovRingP, time, 0.0, ovDensity) +
          0.7 * ovRingGrad(
            ovRingP * ${f(RING_SCALE_2)} + 37.0, time * 1.17, 91.0, ovDensity);
        ovSlope -= ovRings * (ovRain * ${f(RING_SLOPE)});
      }

      vec3 ovWn = normalize(vec3(ovSlope.x, 1.0, ovSlope.y));

      float ovCosV = max(dot(ovWn, ovV), 0.0);
      float ovF = ${f(REFLECT_F0)} + (1.0 - ${f(REFLECT_F0)}) * pow(1.0 - ovCosV, 5.0);

      // ---- the sky in the water ----
      //
      // The mirrored view ray. Steep at the far edge of a pool, grazing at
      // the near one, and shivering wherever a ring crosses it - so every
      // term below varies across the water instead of washing it.
      vec3 ovRay = reflect(-ovV, ovWn);
      float ovUp = clamp(ovRay.y, 0.0, 1.0);
      vec3 ovSkyCol = mix(ovSky, ovSkyHi, pow(ovUp, ${f(SKY_GRADIENT_POW)}));

      // Where that ray meets the cloud deck. Dividing by the ray's elevation
      // is the parallax: a grazing ray travels much further before it gets
      // there, so the deck stretches toward the near edge of the pool and
      // swims when the camera moves.
      vec2 ovDeck = vWorldXZ + ovRay.xz * (${f(CLOUD_HEIGHT)} / max(ovRay.y, 0.08));
      vec2 ovCloudP =
        (ovDeck + vec2(time * ${f(CLOUD_DRIFT)}, time * ${f(CLOUD_DRIFT * 0.6)})) *
        ${f(CLOUD_SCALE)};
      float ovCloud =
        ovGnoise(ovCloudP) * 0.62 + ovGnoise(ovCloudP * 2.7 + 13.0) * 0.38;
      // Only where the water is actually showing sky: a near-horizontal ray
      // is looking at the far ground, and putting clouds there is what a
      // scrolling texture would do.
      ovCloud = smoothstep(${f(CLOUD_LO)}, ${f(CLOUD_HI)}, ovCloud) * ovUp;
      ovSkyCol *= mix(1.0, ${f(CLOUD_LIT)}, ovCloud);

      vec3 ovRefl = ovSkyCol * ${f(r.sky)} * ovF;

      // The sun, cut by its own shadow so a puddle under a wall stays dark.
      //
      // The halo is the bright patch of SKY around the sun, so it is tested
      // on the mirrored ray - where the water is looking - and not on the
      // half vector. On a near-level pool the half vector barely changes
      // across the whole surface, so a halo built on it is another flat
      // wash; on the ray it swings with the ripple and slides as you walk,
      // which is the point of having it at all.
      ovRefl += ovSkyCol *
        pow(max(dot(ovRay, ovSunDir), 0.0), ${f(SUN_HALO_GLOSS)}) *
        ${f(SUN_HALO)} * ${sunShadowVar} * max(ovF, 0.25);

      // The pin-point glint stays on the half vector: that one is a
      // specular highlight on the surface, not a piece of sky.
      vec3 ovH = normalize(ovV + ovSunDir);
      ovRefl += vec3(1.0) * pow(max(dot(ovWn, ovH), 0.0), ${f(r.gloss)}) *
        ${f(SUN_GLINT)} * ${sunShadowVar} * max(ovF, 0.25);

      // The torches: a glint and, under it, the smeared glow of the flame.
      for (int i = 0; i < ${REFLECT_LIGHTS}; i++) {
        vec3 ovL = ovLightPos[i].xyz - vWorldPos;
        float ovD = length(ovL);
        ovL /= max(ovD, 0.001);
        float ovAtt = max(0.0, 1.0 - ovD / max(ovLightPos[i].w, 0.001));
        ovAtt *= ovAtt;
        vec3 ovLh = normalize(ovV + ovL);
        float ovNdh = max(dot(ovWn, ovLh), 0.0);
        ovRefl += ovLightCol[i] * ovAtt * (
          pow(ovNdh, ${f(r.gloss)}) * ${f(TORCH_GLINT)} +
          pow(ovNdh, ${f(TORCH_GLOW_GLOSS)}) * ${f(TORCH_GLOW)}
        ) * max(ovF, 0.25);
      }

      // Bounded: three torches and the sun on one grazing fragment must
      // bloom, not white the pool out.
      ${colorVar} += min(ovRefl, vec3(1.5)) * ovWater;
    }
`;
}

/** The pool's lights and the sky colour, for the water. */
function bindReflect(
  effect: Effect,
  overlays: readonly TerrainOverlay[],
  scene: Scene,
  on: boolean
): void {
  if (!hasRelief(overlays)) {
    const sun = sunDirection(scene);
    effect.setFloat3('ovSunDir', sun.x, sun.y, sun.z);
  }

  // The HORIZON the water reflects. The fog colour is what the map's own
  // distance fades to, so it is the horizon by construction; with no fog
  // running, the clear colour is the sky. Black either way is "reflects
  // nothing", which is safe.
  const fog = shownFogColor();
  const hasFog = fog[0] + fog[1] + fog[2] > 0;
  const clear = scene.clearColor;
  const horizon: readonly [number, number, number] = hasFog
    ? [fog[0], fog[1], fog[2]]
    : [clear.r, clear.g, clear.b];

  effect.setFloat3(
    'ovSky',
    on ? horizon[0] : 0,
    on ? horizon[1] : 0,
    on ? horizon[2] : 0
  );

  // The ZENITH: the mood's own sky light, which is the colour everything on
  // the map is already being lit from above by, so the water agrees with the
  // scene rather than inventing a second sky.
  //
  // Held apart from the horizon by at least ZENITH_SEPARATION, and never
  // above it: a map whose sky light and fog happen to match would otherwise
  // reflect a flat colour again — the exact failure the gradient exists to
  // fix — and the sky is darker overhead than at the horizon in every grade
  // this project has.
  const zenith = shownSkyLight();
  for (let i = 0; i < 3; i++) {
    skyHi[i] = on
      ? Math.min(zenith[i], horizon[i] * (1 - ZENITH_SEPARATION))
      : 0;
  }
  effect.setFloat3('ovSkyHi', skyHi[0], skyHi[1], skyHi[2]);

  const o = overlays.find(l => l.reflect)!;
  const rain = rainStrength();
  effect.setFloat('ovRipple', on ? rain * o.reflect!.ripple : 0);
  // The drop rings read the rain directly, not the recipe's ripple tuning:
  // how many drops are landing is a fact about the sky, not about how glossy
  // this particular map's water was dialled.
  effect.setFloat('ovRain', on ? rain : 0);

  const lights = pointLightPoolLights();
  for (let i = 0; i < REFLECT_LIGHTS; i++) {
    const l = lights[i];
    const k = on && l && l.intensity > 0 ? l.intensity : 0;
    reflectPos[i * 4] = l ? l.position.x : 0;
    reflectPos[i * 4 + 1] = l ? l.position.y : 0;
    reflectPos[i * 4 + 2] = l ? l.position.z : 0;
    reflectPos[i * 4 + 3] = l ? l.range : 0;
    reflectCol[i * 3] = l ? l.diffuse.r * k : 0;
    reflectCol[i * 3 + 1] = l ? l.diffuse.g * k : 0;
    reflectCol[i * 3 + 2] = l ? l.diffuse.b * k : 0;
  }
  effect.setArray4('ovLightPos', reflectPos);
  effect.setArray3('ovLightCol', reflectCol);
}

const reflectPos: number[] = new Array(REFLECT_LIGHTS * 4).fill(0);
const reflectCol: number[] = new Array(REFLECT_LIGHTS * 3).fill(0);
const skyHi: [number, number, number] = [0, 0, 0];
