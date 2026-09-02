import type { WeatherLayer } from './layer';
import { DRAWN_SHAPES, type TrackShape } from './recipes';
import {
  Constants,
  CreatePlane,
  Matrix,
  RawTexture,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  type Mesh,
  type Scene,
} from '../libs/babylon/exports';
import { sunLightOf } from '../lighting/keyRig';

/**
 * Footprints left on the ground: boot marks pressed into settled snow, or
 * stamped in water onto dry stone.
 *
 * Nothing in the original does this — there is no decal system in the client
 * at all — so the shape of it is ours. It is deliberately **not** a terrain
 * overlay layer (`terrainOverlay.ts`): that mask is one texel per tile, which
 * is about a person's whole stride, and a boot print is a tenth of a tile. So
 * prints are geometry — flat quads drawn as **thin instances of one mesh**, so
 * the whole trail is a single draw call, in a ring pool that bounds the cost
 * and lets a long walk trail off behind you.
 *
 * ### Why this is a shader and not a painted sprite
 *
 * The first two cuts baked the shading into the texture and drew it with a
 * `StandardMaterial`. Both read as a sticker lying on the snow rather than a
 * hole in it, and the reason is that a painted print has no light direction.
 *
 * Baking one in is not an option either: the quad rotates to the walk heading,
 * so a print baked as "lit from the left" is lit from the right the moment the
 * hero turns round, and a trail that curves would have every print lit
 * differently. That is what pushed the earlier cuts toward rotation-invariant
 * ambient occlusion, and rotation-invariant is exactly what *flat* means.
 *
 * The way out is to bake a **normal map** rather than a shading, and rotate it
 * into world space in the shader using the instance's own axes — which are
 * sitting right there in the thin-instance matrix. Every print on the map is
 * then lit from the same sun however it is turned: one wall of the hollow
 * catches the light, the opposite wall falls into shadow, and that pairing is
 * the cue that says *hole* instead of *smudge*.
 *
 * On top of that the lookup is **parallax-offset** by depth, so the far wall
 * of the hollow comes into view and the near wall hides behind its own rim.
 * That is the part that reads as the foot having gone down into the surface
 * rather than sat on it.
 *
 * ### Why it multiplies
 *
 * The blend is `ALPHA_MULTIPLY` — `blendFunc(DST_COLOR, ZERO)` — so a fragment
 * multiplies whatever the terrain already drew, and white means "leave it
 * alone". That buys correctness for free: a print inside a building's shadow,
 * or on ground the snow overlay has only half covered, darkens by the right
 * *proportion* instead of compositing toward a fixed colour that assumed full
 * sun.
 *
 * The one thing it cannot do is draw brighter than the ground, and that costs
 * nothing here. Sunlit snow is already at the top of the range: an earlier cut
 * drew a "bright" displaced-snow lip and measured it at 1.04x its
 * surroundings, which is invisible. In snow, all of the readable signal is
 * darkening.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * The two ring pools every kind is split across, and why there are two.
 *
 * A pool is a ring: the oldest print is dropped to make room for the newest,
 * so the number of slots IS how long a trail can be. The hero at a walking
 * stride lays four prints a tile, which at 64 slots is about sixteen tiles of
 * trail behind them — everything older is carried by the ploughed channel in
 * `snowTrail.ts`, which is a depth map and does not run out.
 *
 * Once everything else in the world leaves prints too, one shared ring means
 * a yeti crossing the square evicts the hero's own trail, and the trail that
 * matters most is the one leading away from where you are standing. So the
 * hero keeps a ring of their own at exactly the size they had, and everyone
 * else shares a bigger one. Two meshes rather than one, therefore two draw
 * calls per kind — the same price the drag marks were judged worth paying,
 * and for a better reason.
 */
export type PrintLane = 'hero' | 'crowd';

const POOL: Record<PrintLane, number> = {
  hero: 64,
  /**
   * Twice the hero's. Quadrupeds lay two prints a footfall and insects put
   * them down every third of a tile, so a crowd drains a ring far faster
   * than one walker does; the footprint system caps how many walkers are
   * live at once (`MAX_WALKERS`), which is what actually bounds this.
   */
  crowd: 128,
};

/**
 * Tiles above the terrain the quad sits, to stay off the ground plane.
 *
 * Small, because the quad is now tilted onto the ground's own slope: a decal
 * held flat while the terrain tilts under it has to be lifted far enough to
 * clear the high side, and that lift is what reads as the print floating.
 */
const Z_LIFT = 0.012;

/**
 * Every number that decides how a print looks, in one mutable object.
 *
 * These were tuned by round-tripping screenshots, which is a slow and
 * imprecise way to find a look: one parameter per message, each change landing
 * blind. So they are read rather than baked in, and exposed on
 * `window.muFootprints` so they can be dialled live —
 * `muFootprints.set({ length: 0.7, depth: 0.2 })` rebuilds the soles and the
 * materials on the spot. Find the look in one session, then paste the numbers
 * back here as the defaults.
 *
 * Sizes are in tiles, and they are the size of the **print** — the outline the
 * boot leaves — not of the quad that carries it. The quad is larger, because
 * the crest of shouldered snow sits outside the outline and the relief march
 * needs margin to walk into; `SOLE_FILL` is the ratio and `quadWidth` /
 * `quadLength` do the conversion.
 *
 * That distinction is not pedantry. These two numbers used to be the quad, and
 * every size reported from this file was therefore wrong by the fill fraction:
 * "0.85 x 0.5 tiles" was really a print of 0.61 x 0.20, a 3:1 sliver, which is
 * exactly how it looked in play. A tuning value that does not mean what it
 * says cannot be dialled by looking at the screen.
 */
export const FOOTPRINT_TUNING = {
  /**
   * Length of the print along the walk.
   *
   * Down from 0.55, and the reason is the gait rather than the shape. A walk
   * alternates feet, so consecutive prints have to be further apart ALONG the
   * track than a print is long - otherwise they overlap end to end, and two
   * prints that overlap by nearly half their length stop reading as "left,
   * then right" and start reading as a PAIR laid down together. At 0.55 with a
   * stride of 0.34 the overlap was 0.23, which is exactly what that looked
   * like.
   *
   * Shortening the print is the half of the fix that costs nothing: it also
   * takes the outline from 2.06:1 to about 1.6:1, which is closer to the
   * reference's proportions than it was. The other half is STRIDE.
   */
  length: 0.42,
  /**
   * Width of the print across it.
   *
   * A bounding width the waist never quite reaches: the superellipse's
   * half-width is scaled by the arch modulation, which peaks around 0.92 at
   * the ball and dips to 0.72 at the waist, so the outline this draws measures
   * roughly 0.28 across against a length of 0.58 - about 2:1, which is the
   * proportion the reference's prints have.
   * Left as the bound rather than divided out, because the alternative is a
   * number that means "width, after a correction factor" and is worse to
   * reason about than one that means "width, before the boot shape".
   */
  width: 0.32,
  /**
   * How far the hollow goes down. Drives relief, parallax and occlusion.
   *
   * Set for a leg that went *in* rather than a sole that pressed down - in
   * snow this deep the boot does not stamp a surface, it punches a shaft and
   * the snow closes round the ankle.
   */
  depth: 0.34,
  /**
   * Where the cavity profile saturates. Low is a rigid sole — a broad flat
   * floor with a wall round it; high is a soft dish ramping to a point. The
   * flat floor is what gives a print weight, because occlusion needs area to
   * act on: at 0.98 no amount of occlusion moved the mean by more than 0.01.
   */
  wallEdge: 0.5,
  /**
   * How much sky the floor of the cavity loses.
   *
   * The floor of a rigid sole is flat, so its normal matches the ground's and
   * the lambert term cancels - this occlusion IS the darkening, and it is the
   * only dial that reaches the middle of the print.
   */
  // Down from 0.55 against improved.jpg: the reference print floor is a pale
  // blue-white, only ~0.75 of the snow beside it, and its depth is carried
  // by the wall gradient and the rim, not by a dark floor.
  // Up again for improved_2.jpg: with the field held at 0.86 instead of
  // clipping white, the trench walls have to reach ~0.5 to read as depth.
  // Down again for the reworked trail: the decal is now a faint pocket in
  // the trench (walk print 0.28) and the trench carries the depth, so a
  // 0.72 floor only put a dark ring inside the channel.
  ao: 0.45,
  /**
   * Ambient light in the cavity. High, because snow is close to a perfect
   * diffuser and a hollow's walls bounce light into each other. Dropping this
   * is what turns prints into black holes.
   */
  // 0.52 → 0.7: with post-processing off there is no exposure lift, and the
  // 0.52 print read as a dark oval with a dark ring (the "before" shot).
  ambient: 0.7,
  /**
   * Light the crest may add on top of the snow beside it. Raised: the
   * reference's prints are read mostly by a bright pushed-up lip on the
   * sunward side, against a floor that is barely darker than the field.
   */
  rim: 0.8,
  /**
   * How far a character standing in snow this deep sinks, as a fraction of
   * `depth`.
   *
   * Lives here rather than in the sink code so it cannot drift away from the
   * hole it is standing in: the print is the evidence that the leg went down,
   * and a character whose boots rest on the surface next to a 0.34-tile hole
   * is visibly floating. Well under 1 because a boot compacts the snow under
   * it rather than displacing all of it - and because the print's own depth is
   * measured to its floor, which is under the sole, not under the ankle.
   */
  sink: 0.6,
  /**
   * Colour the hollow tends toward at full depth, as a surviving fraction.
   *
   * Devias' own blue. `DEVIAS_MOOD` grades the map at `shadowsHue: 232` and
   * bakes the terrain at [1.02, 1.08, 1.18], so the map's shadows are already
   * blue-violet - and a near-white [0.85, 0.92, 1] against that reads as a
   * hole with the colour drained out rather than as shade. Matched to the
   * terrain overlay's `CAVITY_TINT`, so a footprint's shadow and a drift's
   * are the same colour on the same map.
   */
  //
  // Then paled to match the overlay's new CAVITY_TINT (same hue, half the
  // chroma): [0.42, 0.56, 0.88] is a saturated blue that depended on the
  // grade's shadow desaturation to read as shade, and without
  // post-processing it read as blue paint in the hole.
  tint: [0.62, 0.66, 0.76] as [number, number, number],
};


/** Texture resolution of one sole. Enough to resolve the rim. */
const TEX = 96;

/**
 * How many different soles are generated per shape, laid out along the atlas
 * row.
 *
 * Every print used to be the same texture, which at the size these are now is
 * plainly visible - a row of identical stamps reads as a repeated decal
 * however good any one of them is. Four is enough that a trail never shows the
 * same shape twice in a row, and it fits an atlas that needs no extra vertex
 * buffer: the per-instance colour already had two channels doing nothing (the
 * tint written into rgb was the same value for every instance of a kind, so it
 * belonged in a uniform), and those now carry the atlas offset.
 */
const VARIANTS = 4;

/**
 * The atlas is a grid: **one column per variant, one row per `TrackShape`**.
 *
 * It started as a 2x2 of four boots. Monsters need silhouettes of their own —
 * a paw is not a boot with noise on it — and a silhouette is exactly what the
 * sole texture is, so a shape is a row and the per-instance atlas offset that
 * already picked the variant now picks the pair. Nothing else about the
 * instancing changes: still one mesh, one draw call, one texture per kind.
 */
const ATLAS_COLS = VARIANTS;

/** Rows this kind needs. Only the snow and wet soles vary by shape. */
function atlasRows(kind: PrintKind): number {
  return kind === 'drag' ? 1 : DRAWN_SHAPES.length;
}

/** Which row of the atlas a shape is baked into; -1 for the ones never drawn. */
function shapeRow(shape: TrackShape): number {
  return (DRAWN_SHAPES as readonly TrackShape[]).indexOf(shape);
}

/**
 * How much of the atlas, per axis, one sole spans — 1/cols by 1/rows.
 *
 * Anything measured in texture space has to be scaled by this. The relief
 * march is the one that matters: its reach is a depth expressed as a fraction
 * of the quad, and the quad stopped covering the whole texture the moment the
 * atlas went in. It is a `vec2` and no longer a single number, because the
 * grid is no longer square.
 */
function atlasSpan(kind: PrintKind): [number, number] {
  return [1 / ATLAS_COLS, 1 / atlasRows(kind)];
}

/** Sub-rect origin of one cell, in atlas UV. */
function cellOffset(
  kind: PrintKind,
  shape: TrackShape,
  variant: number
): [number, number] {
  const [su, sv] = atlasSpan(kind);
  const row = kind === 'drag' ? 0 : Math.max(0, shapeRow(shape));
  return [variant * su, row * sv];
}

/**
 * Fraction of the quad, per axis, that the sole's outline spans.
 *
 * The quad must be bigger than the print: the crest of shouldered snow lands
 * outside the outline, and the relief march needs somewhere to walk. Equal on
 * both axes on purpose - when `ru` and `rv` differed (0.2 against 0.36) the
 * silhouette carried a 1.8:1 stretch of its own on top of whatever the quad's
 * aspect was, and the two multiplied into a shape far thinner than either
 * number suggested. The print's proportions now come from `FOOTPRINT_TUNING`
 * alone, where they can be read.
 */
const SOLE_FILL = 0.62;

/**
 * How wide each shape is against the tuned width, at the same length.
 *
 * The *proportions* of a print belong to its shape and the *size* belongs to
 * the creature (`TrackRecipe.scale`, which scales both axes together). Keeping
 * them apart is what lets one baked row serve every recipe that uses it: a
 * yeti's foot and a hound's are the same pad at different sizes, so they share
 * an atlas row, and a row can only be baked at one aspect.
 *
 * Length is never varied, and that is load-bearing: the relief march's reach
 * is a single uniform expressed as a fraction of the quad's length (the axis
 * the march mostly runs along), so a per-shape length would need a per-
 * instance reach and there is no channel left to carry one.
 */
const SHAPE_ASPECT: Record<TrackShape, number> = {
  /** The reference. A boot is much longer than it is wide. */
  boot: 1,
  /** Pad plus toes: near enough round. */
  paw: 1.3,
  /** Talons fan out sideways, so this is the widest of them. */
  claw: 1.45,
  /** Two crescents side by side — a shade narrower than a boot. */
  hoof: 0.95,
  /** A leg tip: a slot, not a print. */
  chitin: 0.6,
  /** A big round crushing foot. */
  pad: 1.35,
  /** Never drawn; a value only so the record is total. */
  none: 1,
};

/** World width of the quad carrying a print of this shape, in tiles. */
function quadWidth(shape: TrackShape = 'boot'): number {
  return (FOOTPRINT_TUNING.width * SHAPE_ASPECT[shape]) / SOLE_FILL;
}

/** World length of the quad carrying a print of the tuned length, in tiles. */
function quadLength(): number {
  return FOOTPRINT_TUNING.length / SOLE_FILL;
}


/**
 * `drag` is the shallow trough between two footfalls, where the boot swings
 * forward without clearing the snow. It is what turns a row of separate holes
 * into a **trail**, which is the difference between "someone stamped here" and
 * "someone walked through".
 */
export type PrintKind = 'wet' | 'snow' | 'drag';

/** Prints at full strength after the last time the boots were in water. */
export const FULL_STEPS = 6;

/** Prints over which a full boot dries to nothing after those. */
export const FADE_STEPS = 10;

/**
 * How much water the sole still has to give, by prints since it was last in
 * water: full for the first `FULL_STEPS`, then dimming to nothing over the
 * next `FADE_STEPS`.
 *
 * A boot does not dry by the clock, it dries by being walked on, which is why
 * this counts prints and not seconds — standing still in a doorway leaves the
 * sole exactly as wet as it was.
 */
export function bootStrength(stepsSinceWet: number): number {
  if (stepsSinceWet <= FULL_STEPS) return 1;
  return Math.max(0, 1 - (stepsSinceWet - FULL_STEPS) / FADE_STEPS);
}

type Print = {
  /** Seconds this print has been on the ground; -1 when the slot is free. */
  age: number;
  life: number;
  /** 0…1 at birth, before ageing. */
  strength: number;
  kind: PrintKind;
  /** Which silhouette it was pressed with; re-treading only merges its own. */
  shape: TrackShape;
  matrix: Matrix;
  /** Which cell of the sole atlas this print draws from. */
  atlasU: number;
  atlasV: number;
  /** Its own brightness, so a trail does not repeat its weight either. */
  shade: number;
};

/**
 * Per-kind colour, carried on the instance and applied in proportion to depth.
 *
 * Snow is a *slight* blue: the only light reaching the bottom of a hole in
 * snow is sky, so the hollow goes cold while the untouched rim stays neutral.
 * Wet is the whole effect — water on stone has no relief to shade, just a
 * darker, less saturated patch where the film fills the surface roughness.
 */
const TINT: Record<PrintKind, readonly [number, number, number]> = {
  wet: [0.45, 0.48, 0.56],
  // The walk trench: the same snow as the prints, so its floor takes the
  // same cool tint - it is one channel with pockets in it, not two layers.
  drag: [0.6, 0.64, 0.75],
  // Barely tinted, strongly cool: it is a *proportion* of the snow that
  // survives, per channel, so red losing a little where blue loses none is a
  // shadow that goes icy rather than grey. Light, because the whole print is
  // meant to be a suggestion at this depth.
  snow: [0.85, 0.92, 1],
};

/** How strongly a fresh print of this kind is applied. */
const PEAK: Record<PrintKind, number> = {
  wet: 0.85,
  // Full: the walk trench IS the trail (improved_2.jpg), the prints are
  // pockets in its floor. How much of it a gait lays is decided per gait in
  // footprintSystem.ts (a run lays none), not here.
  drag: 1,
  // The relief and the AO carry snow, so a fresh print applies in full.
  snow: 1,
};

/** Seconds a print lasts before it has gone completely. */
const LIFE: Record<PrintKind, number> = {
  // Water on stone: gone in well under a minute.
  wet: 22,
  // Matches the prints it joins, so a trail fades as one thing.
  drag: 55,
  // A print in snow survives until the fall covers it again.
  snow: 55,
};

/** Fraction of its life a print spends fading out at the end. */
const FADE_TAIL = 0.55;

/** Flat ground, for callers that have not worked out a slope. */
const UP = { x: 0, y: 1, z: 0 };

/**
 * One ring pool per kind, each with its own mesh.
 *
 * The kinds used to share a single mesh that swapped material, which was fine
 * while only one could be on screen at a time. Drag marks broke that: a trail
 * is prints **and** the troughs between them, both visible at once. Two meshes
 * is two draw calls, which is a fair price for the trail reading as one thing.
 */
type Pool = {
  mesh: Mesh;
  matrixData: Float32Array;
  colourData: Float32Array;
  prints: Print[];
  /** How many slots this pool has — the hero's ring is smaller (see `POOL`). */
  size: number;
  next: number;
  dirty: boolean;
};

// ---- 2. state + readers ----------------------------------------------------

/** Keyed by kind **and** lane: `snow|hero` and `snow|crowd` are two rings. */
const pools = new Map<string, Pool>();

const poolKey = (kind: PrintKind, lane: PrintLane) => `${kind}|${lane}`;

/** Deterministic value noise, so a sole is the same every run. */
function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);

  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);

  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The silhouette: **a waisted superellipse** — the outline of a boot sole.
 *
 * One connected shape, not a ball plus a separate heel: pressed into snow the
 * whole sole bears down and the arch fills in, so the print has a waist rather
 * than a gap. But it is emphatically not an ellipse either. An ellipse with
 * angular wobble on it came out looking like a bird track, because the wobble
 * has to be large before it stops reading as a curve, and by then the lobes
 * are claws.
 *
 * A superellipse gets there without any wobble at all: exponent ~2.6 gives
 * squared-off, rounded ends instead of points, which is the single strongest
 * cue for "boot" as opposed to "animal". The waist and the wider ball do the
 * rest.
 *
 * **v = 1 is the toe.** The chain that decides this is worth spelling out,
 * because it is three conventions deep and an early cut had the prints walking
 * backwards: `CreatePlane` puts v=0 at local y -0.5, the baked `rotation.x` of
 * +90 deg sends local y -0.5 to z -0.5, and `addFootprint` lays the length
 * axis (local +Z) along the direction of travel. So high v is forward, and the
 * ball of the foot belongs there.
 */
const SOLE = {
  cu: 0.5,
  cv: 0.5,
  /**
   * Half-width and half-length of the sole in texture space.
   *
   * Equal, and derived rather than authored: the print's proportions are the
   * quad's, set in `FOOTPRINT_TUNING`. See `SOLE_FILL`.
   */
  ru: SOLE_FILL / 2,
  rv: SOLE_FILL / 2,
  /**
   * Superellipse exponent. 2 is an ellipse; higher squares off the ends.
   *
   * Down from 2.6, which was only ever survivable because `ru` and `rv`
   * differed by 1.8:1 - the stretch disguised the squaring. With the radii
   * equal, 2.6 draws a squircle, and that is exactly what it looked like: a
   * rounded square pressed into the snow. Just over 2 keeps a trace of the
   * flattened end without the corners, and the boot cue now comes from the
   * waist and the ball, which is where it should have come from anyway.
   */
  power: 2.05,
  /** How far the arch pulls in, as a fraction of the width. */
  waist: 0.3,
  /** Where the waist sits along the sole; negative is toward the heel. */
  waistAt: -0.1,
  /** Extra width at the ball of the foot, forward of the waist. */
  ball: 0.1,
};

/**
 * Signed depth into the silhouette at (u, v): positive inside, negative out,
 * roughly in units of "fraction of the way to the middle".
 */
/**
 * Per-variant silhouette jitter.
 *
 * Deterministic in the variant index, so the four soles are stable across a
 * rebuild and a test can assert on them. Kept small: these are four boots off
 * the same last, not four different animals.
 */
function variantShape(seed: number) {
  const j = (k: number) => hash2(seed * 7.3 + k * 3.1, seed * 2.9 + k * 5.7) - 0.5;
  return {
    power: SOLE.power + j(0) * 0.35,
    waist: SOLE.waist + j(1) * 0.14,
    ball: SOLE.ball + j(2) * 0.08,
    waistAt: SOLE.waistAt + j(3) * 0.1,
    /** Rolls the noise so no two variants share a crumb or a rim lump. */
    nu: seed * 37.1,
    nv: seed * 53.7,
  };
}

/**
 * One superellipse lobe, in the normalised print space every shape works in:
 * `(a, b)` is the offset from the lobe's centre divided by its own radii, so
 * the outline is at length 1 and the answer is positive inside it, roughly in
 * units of "fraction of the way to the middle".
 *
 * `power` is the corner: 2 is an ellipse, above it squares off toward a
 * rounded rectangle, below it pinches toward a diamond — which is the whole
 * difference between a boot, a pad and a leg tip.
 */
function lobe(a: number, b: number, power: number): number {
  return (
    1 -
    Math.pow(
      Math.pow(Math.abs(a), power) + Math.pow(Math.abs(b), power),
      1 / power
    )
  );
}

/**
 * The silhouettes, in the space where the print's own outline is the unit
 * circle-ish: `du` and `dv` run -1…1 across the print's width and length, and
 * **+dv is forward** (see the `v = 1 is the toe` note on `SOLE`).
 *
 * Each returns the same signed depth `lobe` does, so a shape is a union of
 * lobes taken with `Math.max` and everything downstream — the wall profile,
 * the crest, the clods, the normals — is written once and works for all of
 * them. Adding a shape is a case here, a row in `DRAWN_SHAPES` and an aspect
 * in `SHAPE_ASPECT`; nothing else in the file needs to know.
 */
function shapeDepth(
  shape: TrackShape,
  du: number,
  dv: number,
  V: ReturnType<typeof variantShape>
): number {
  switch (shape) {
    case 'paw': {
      // A pad and four toes. The pad narrows toward the heel, which is what
      // makes it read as an animal's foot and not as a circle: a dog's, a
      // wolf's and a yeti's are all this shape at different sizes.
      const padW = 0.54 + 0.22 * smoothstep(-1, 0.2, dv);
      let best = lobe(du / padW, (dv + 0.38) / 0.55, 2.5);

      for (let i = 0; i < 4; i++) {
        // -1, -1/3, 1/3, 1 across the front of the pad.
        const t = (i - 1.5) / 1.5;
        // The outer toes sit back a little, so the four land on an arc.
        const cv = 0.62 - Math.abs(t) * 0.13;
        // Small, and spread wide enough to stay four. The first cut had them
        // at 0.27 across on 0.4 centres, so every neighbour overlapped and
        // the four came out as one bar across the front of the pad — which
        // is the difference between an animal's foot and a shoe.
        best = Math.max(best, lobe((du - t * 0.72) / 0.19, (dv - cv) / 0.25, 2.2));
      }

      return best;
    }

    case 'claw': {
      // Three talons fanning off a small heel. Each is built in its own
      // frame and tapers toward its tip, so the points splay outward
      // instead of all pointing up the track.
      let best = lobe(du / 0.4, (dv + 0.5) / 0.4, 2.4);

      for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.62;
        const sa = Math.sin(a);
        const ca = Math.cos(a);
        const ou = du - sa * 0.68;
        const ov = dv - (0.04 + ca * 0.5);
        const along = ou * sa + ov * ca;
        const across = ou * ca - ov * sa;
        // Narrower the further out the talon goes: a claw, not a finger.
        const w = 0.25 * (1 - 0.55 * smoothstep(-0.25, 0.55, along));
        best = Math.max(best, lobe(across / w, along / 0.52, 2.1));
      }

      return best;
    }

    case 'hoof': {
      // Two crescents with the cleft open between them. Each half swings
      // outward toward the toe (the `b * b` lean), which is what stops the
      // pair reading as two plain ovals side by side.
      let best = -1;

      for (let s = -1; s <= 1; s += 2) {
        const b = (dv - 0.02) / 0.86;
        const a = (du - s * 0.46) / 0.38 + s * 0.28 * b * b;
        best = Math.max(best, lobe(a, b, 2.6));
      }

      return best;
    }

    case 'chitin': {
      // A leg tip, not a foot: one narrow slot with a point at each end
      // (power under 2 pinches the ends), and the dew claw behind it. Small
      // and deep is the read — an insect's weight goes through a needle, and
      // the two marks have to stay two: at 0.78 long the slot ran back into
      // the dew and the pair came out as one streak.
      const tip = lobe(du / 0.42, (dv - 0.32) / 0.5, 1.7);
      const dew = lobe(du / 0.22, (dv + 0.62) / 0.22, 2);
      return Math.max(tip, dew);
    }

    case 'pad': {
      // A big round crushing foot, a shade wider at the front, with three
      // blunt toe bulges on the leading edge. No arch and no waist: nothing
      // this heavy has an instep.
      const w = 0.9 + 0.1 * smoothstep(-1, 0.3, dv);
      let best = lobe(du / (0.92 * w), dv / 0.95, 2.8);

      for (let i = 0; i < 3; i++) {
        best = Math.max(
          best,
          lobe((du - (i - 1) * 0.5) / 0.26, (dv - 0.8) / 0.3, 2.4)
        );
      }

      return best;
    }

    case 'boot':
    default: {
      // Width along the sole: pinched at the arch, widest at the ball.
      const arch = (dv - V.waistAt) / 0.42;
      const width =
        1 - V.waist * Math.exp(-arch * arch) + V.ball * smoothstep(0, 0.75, dv);

      return lobe(du / width, dv, V.power);
    }
  }
}

function soleDepth(
  shape: TrackShape,
  u: number,
  v: number,
  seed = 0
): number {
  // Warp the sampling point before testing the ellipses. Roughening only the
  // edge value leaves a shape that is still obviously two ovals; bending the
  // domain underneath makes the outline itself wander, which is what a hole
  // punched into loose snow actually looks like.
  const V = variantShape(seed);

  // Domain warp, rolled per variant so no two soles wander the same way.
  const wu = u + (noise2(u * 4 + 3.1 + V.nu, v * 4 + 1.7 + V.nv) - 0.5) * 0.11;
  const wv = v + (noise2(u * 4 + 9.3 + V.nu, v * 4 + 5.2 + V.nv) - 0.5) * 0.11;

  const du = (wu - SOLE.cu) / SOLE.ru;
  const dv = (wv - SOLE.cv) / SOLE.rv;

  const best = shapeDepth(shape, du, dv, V);

  // Grain on the outline. Enough to keep the rim off a drawn curve, small
  // enough that the sole still reads as a sole -- a large wobble here is what
  // turned the previous cut into a bird track.
  const n =
    noise2(u * 8 + V.nu, v * 8 + V.nv) * 0.6 +
    noise2(u * 22 + V.nu, v * 22 + V.nv) * 0.4 -
    0.5;

  return best + n * 0.15;
}

/** Lattice the flung clods are scattered on. */
const CELL = 20;

/** A clod of snow thrown clear of the print, or 0. */
function clodAt(u: number, v: number, s: number, seed = 0): number {
  // Only just outside the outline. Beyond about half a print-radius out the
  // foot had no reach.
  if (s >= -0.02 || s <= -0.5) return 0;

  const cx = Math.floor(u * CELL);
  const cy = Math.floor(v * CELL);

  // Thrown forward off the toe, because that is the end that pushed off.
  const forward = 0.5 + 0.5 * smoothstep(0.3, 0.95, v);

  if (hash2(cx * 3.7 + 11 + seed * 13.7, cy * 2.3 + 5 + seed * 9.1) >= 0.34 * forward) return 0;

  const gu = (cx + 0.5) / CELL;
  const gv = (cy + 0.5) / CELL;
  const gd = Math.sqrt((u - gu) * (u - gu) + (v - gv) * (v - gv)) * CELL;

  return Math.max(0, 1 - gd * 1.5);
}

/**
 * The sole as a height field, plus the coverage that goes with it.
 *
 * Height is in normalised units for both kinds: -1 is the floor of the hollow,
 * positive is snow pushed up above the surrounding level.
 */
function soleHeight(
  kind: PrintKind,
  shape: TrackShape,
  seed = 0
): {
  height: Float32Array;
  coverage: Float32Array;
} {
  const height = new Float32Array(TEX * TEX);
  const coverage = new Float32Array(TEX * TEX);

  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const i = y * TEX + x;
      const u = (x + 0.5) / TEX;
      const v = (y + 0.5) / TEX;
      const s = soleDepth(shape, u, v, seed);

      if (kind === 'drag') {
        // The ploughed trench of a walk through deep snow (improved_2.jpg):
        // a broad flat-floored channel, walls that rise steeply to a broken,
        // shouldered crest, tapering at both ends where it runs under the
        // prints it joins so the trail flows into them rather than butting
        // up against them.
        // The walls WANDER along the run - a low-frequency drift of each
        // edge, independently per side - and that is what stops the channel
        // being a straight-sided rectangle. A separate, finer noise roughens
        // the wall itself.
        const side = u < 0.5 ? 0 : 1;
        const wander =
          (noise2(v * 2.2 + seed * 13.1 + side * 40, seed * 7.7 + side * 9) - 0.5) *
          0.16;
        const edge = 0.4 + wander;
        const across = 1 - Math.abs(u - 0.5) / edge;
        const groove =
          across + (noise2(u * 9 + seed * 31.3, v * 5 + seed * 17.9) - 0.5) * 0.2;

        // The taper multiplies the finished profile rather than feeding into
        // it. Folded in before the threshold, the ends slide down through the
        // lip band on their way to zero and cap the trough with a bright rim
        // exactly where it is supposed to be disappearing under a print.
        // Short: pieces overlap by more than this, so the ends cross-fade
        // inside the neighbour and the channel has no seams.
        const taper = smoothstep(0, 0.22, v) * smoothstep(0, 0.22, 1 - v);

        // Steep wall, broad floor: saturates a third of the way in.
        const cut = smoothstep(0.08, 0.36, groove) * taper;
        // The crest is lumpy along its run - snow shouldered aside lands in
        // heaps, not in a piped border.
        const heap =
          0.4 + 0.6 * noise2(u * 6 + seed * 41.3, v * 14 + seed * 23.7);
        const lip =
          Math.exp(-Math.pow((groove - 0.02) / 0.08, 2)) * taper * heap;
        // Trodden floor: the pockets left by each boot merge into an uneven
        // bottom rather than a machined channel.
        // Churned: two octaves, the coarse one the clumps the boots turned
        // over, the fine one the broken crust between them. Big enough to be
        // the floor's texture, not a machined channel.
        const trodden =
          ((noise2(u * 5 + seed * 5.1, v * 7 + seed * 3.3) - 0.5) * 0.3 +
            (noise2(u * 14 + seed * 2.7, v * 19 + seed * 8.9) - 0.5) * 0.14) *
          cut;

        height[i] = -cut * 0.85 + lip * 0.4 + trodden;
        coverage[i] = Math.min(1, cut + lip * 0.9);
        continue;
      }

      if (kind === 'wet') {
        // A stain, not a dent - but NOT flat. The fragment derives
        // everything from depth: the tint mix, the AO darkening, and
        // through them the premultiplied alpha. At height 0, depth is 0,
        // tint is white, keep is 1, and alpha comes out (1 - 1) x strength
        // = ZERO - a perfectly flat wet sole rendered as nothing at all,
        // which is why wet prints were never once seen in play. A shallow
        // dish gives the film a depth for the tint and the occlusion to
        // act on; the gentle rim gradient it adds reads as the wet edge.
        const c = smoothstep(0, 0.16, s);
        height[i] = -0.35 * c;
        coverage[i] = c;
        continue;
      }

      // A dish, not a shaft. The wall ramps the whole way from the outline to
      // the middle, so the floor is a continuous curve rather than a flat
      // bottom with a lip round it — which is what stops the print reading as
      // a cut-out and starts it reading as something pressed.
      // Saturating part-way in is deliberate here: it gives a broad flat
      // floor with a defined wall round it, which is what a **rigid sole**
      // actually leaves. The earlier dish profile ramped the whole way to a
      // point, and that is right for a soft impression but wrong for a boot —
      // it also put most of the print's area at shallow depth, so occlusion
      // had almost nothing to bite on and the print read flat however hard
      // the shading was pushed. Swept over the wall edge with AO at 0.42:
      // 0.45 -> mean 0.73x, 0.6 -> 0.76x, 0.8 -> 0.80x.
      const hollow = smoothstep(-0.08, FOOTPRINT_TUNING.wallEdge, s);

      // The ridge of snow shouldered aside, just outside the outline -- and
      // deliberately **lumpy**, not a smooth band. Its height is modulated by
      // its own noise, so the rim is a broken run of mounds with gaps in it
      // rather than a piped border, which is what a rim reads as when the
      // amplitude is constant all the way round.
      const crestT = (s + 0.07) / 0.075;
      const crestBand = Math.exp(-crestT * crestT);
      const lump =
        0.35 +
        0.65 *
          (noise2(u * 13 + 2.5 + seed * 41.3, v * 13 + 6.5 + seed * 23.7) * 0.7 +
            noise2(u * 31, v * 31) * 0.3);
      const crest = crestBand * lump;

      // Clods of snow flung clear, on a coarse lattice so they land as
      // clumps. These are the texture *around* the rim: without them the
      // print stops dead at its own edge and the snow beyond is glass.
      const clod = clodAt(u, v, s, seed);

      // Pressed snow underfoot: a slow undulation across the floor of the
      // cavity, so the bottom is not a machined surface.
      //
      // It used to be 30 repeats at 0.11 amplitude, which at this print size
      // is a feature every 0.02 tiles - and the floor's normal comes from the
      // gradient of this, so a fine, tall wobble turns into hard speckle the
      // moment there is any occlusion to shade it. That read as a TEXTURE
      // pasted into the bottom of the hole rather than as packed snow. A third
      // of the amplitude at a third of the frequency reads as the floor being
      // uneven, which is all it was ever meant to say.
      const packed = (noise2(u * 11, v * 11) - 0.5) * 0.035 * hollow;
      // Grain along the crest, so the rim is not a clean drawn oval.
      const rimGrain = (noise2(u * 24 + 5, v * 24 + 9) - 0.5) * 0.2 * crestBand;

      height[i] = -hollow + crest * 0.42 + clod * 0.26 + packed + rimGrain;
      coverage[i] = Math.min(1, hollow + crest * 0.8 + clod * 0.9);
    }
  }

  return { height, coverage };
}

/**
 * The sole texture: **R** signed height, biased so 0.5 is the undisturbed
 * surface — below it is the cavity (parallax and AO), above it is the snow the
 * boot pushed up (the rim light and the subsurface term),
 * **G** and **B** the tangent-space normal's x and z, **A** how much of this texel
 * the boot disturbed at all.
 *
 * Generated rather than shipped as an asset — it is a handful of superellipses
 * and some noise, and adding an OZT to the data folder for that would be silly.
 *
 * Every row at once. The **runtime does not use this**: it allocates the atlas
 * empty and bakes a shape's row the first time something presses it
 * (`ensureShape`), because a quarter of a million texels of value noise for
 * silhouettes nothing in the world has is a stall for nothing. This is the
 * whole-atlas form, for the tests that read the cells back.
 */
export function buildSole(kind: PrintKind): Uint8Array {
  const data = new Uint8Array(atlasWidth() * atlasHeight(kind) * 4);

  for (const shape of DRAWN_SHAPES.slice(0, atlasRows(kind))) {
    writeShape(data, kind, shape);
  }

  return data;
}

/** Width of the atlas in texels: one column per variant. */
function atlasWidth(): number {
  return TEX * ATLAS_COLS;
}

/** Height of the atlas in texels: one row per shape this kind needs. */
function atlasHeight(kind: PrintKind): number {
  return TEX * atlasRows(kind);
}

/**
 * Bake one shape's whole row — all four variants — into the atlas buffer.
 *
 * A row at a time rather than the whole atlas, because rows are baked
 * **lazily**: six shapes times four variants is a quarter of a million texels
 * of value noise, and a session that only ever sees a hero and a yeti has no
 * business paying for the spiders. `ensureShape` calls this the first time a
 * shape is actually pressed into the ground and re-uploads the texture.
 */
function writeShape(
  data: Uint8Array,
  kind: PrintKind,
  shape: TrackShape
): void {
  const row = kind === 'drag' ? 0 : Math.max(0, shapeRow(shape));

  for (let v = 0; v < VARIANTS; v++) {
    writeVariant(data, kind, shape, v, v * TEX, row * TEX);
  }
}

/** One sole, rendered into its cell of the atlas. */
function writeVariant(
  data: Uint8Array,
  kind: PrintKind,
  shape: TrackShape,
  seed: number,
  ox: number,
  oy: number
): void {
  const { height, coverage } = soleHeight(kind, shape, seed);

  // The two axes have different world scales, so the gradient is taken in
  // tiles rather than in UV — otherwise the normals would come out stretched
  // by however much longer the print is than it is wide.
  const step = 1 / TEX;
  const perX = FOOTPRINT_TUNING.depth / (2 * step * quadWidth(shape));
  const perZ = FOOTPRINT_TUNING.depth / (2 * step * quadLength());

  const stride = atlasWidth();

  const at = (x: number, y: number) =>
    height[
      Math.min(TEX - 1, Math.max(0, y)) * TEX +
        Math.min(TEX - 1, Math.max(0, x))
    ];

  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const i = y * TEX + x;
      // Destination in the atlas, not in the sole.
      const d = (oy + y) * stride + (ox + x);

      const dx = (at(x + 1, y) - at(x - 1, y)) * perX;
      const dz = (at(x, y + 1) - at(x, y - 1)) * perZ;

      const len = Math.sqrt(dx * dx + 1 + dz * dz);

      const o = d * 4;
      // Signed, biased to the middle. Storing bare depth clamped the crest's
      // height away, which silently made the rim light impossible: `raised`
      // was always zero and the lit ridge never fired.
      data[o] = Math.round(
        Math.min(1, Math.max(0, height[i] * 0.5 + 0.5)) * 255
      );
      data[o + 1] = Math.round((-dx / len) * 0.5 * 255 + 127.5);
      data[o + 2] = Math.round((-dz / len) * 0.5 * 255 + 127.5);
      data[o + 3] = Math.round(Math.min(1, coverage[i]) * 255);
    }
  }
}

/** Atlas dimensions, for tests reading `buildSole`. */
export const soleAtlasSize = (kind: PrintKind): [number, number] => [
  atlasWidth(),
  atlasHeight(kind),
];

/** Side of one sole within the atlas, and how the grid is laid out. */
export const SOLE_TILE = TEX;
export const SOLE_VARIANTS = VARIANTS;
export const SOLE_SHAPES = DRAWN_SHAPES;

/** Peak strength a print of this kind is applied at, before its fade. */
export function solePeak(kind: PrintKind): number {
  return PEAK[kind];
}

/** Colour a print of this kind is tinted toward at full depth. */
export function soleTint(kind: PrintKind): readonly [number, number, number] {
  return TINT[kind];
}

const VERTEX = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

#ifdef INSTANCES
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
#endif

// NOT "color". Babylon rewrites a thin-instance colour buffer to the kind
// "instanceColor" on the way in (thinInstanceMesh.js: "color for instanced
// mesh is ColorInstanceKind and not ColorKind because of native"), so a shader
// declaring "color" binds nothing, gets the default (0,0,0,1), and draws every
// print as an opaque black hole. Babylon's own default shader knows this,
// which is why the StandardMaterial version did not show the bug.
#ifdef INSTANCESCOLOR
attribute vec4 instanceColor;
#endif

uniform mat4 world;
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
// How much of the atlas one sole spans, per axis: 1/cols by 1/rows. The grid
// is not square any more (four variants across, one row per track shape), so
// this is a vec2 and not the single ATLAS_FILL it used to be.
uniform vec2 atlasSpan;

varying vec2 vUV;
varying vec4 vColor;
// Origin of this print's quarter of the sole atlas. The relief march has to be
// held inside it: an unclamped march walks straight into the neighbouring
// sole, and a print would sample the toe of a different boot along its edge.
varying vec2 vAtlas;
varying vec3 vTan;
varying vec3 vBit;
varying vec3 vNrm;
varying vec3 vView;

void main() {
#ifdef INSTANCES
  mat4 finalWorld = world * mat4(world0, world1, world2, world3);
#else
  mat4 finalWorld = world;
#endif

  vec4 worldPos = finalWorld * vec4(position, 1.0);

  // instanceColor is (atlas u, atlas v, brightness jitter, alpha). It used to
  // be (tint.rgb, alpha), but the tint was the same value for every instance
  // of a kind - a uniform's job - which left two channels free for this.
#ifdef INSTANCESCOLOR
  vColor = instanceColor;
  vAtlas = instanceColor.xy;
#else
  vColor = vec4(1.0);
  vAtlas = vec2(0.0);
#endif

  vUV = uv * atlasSpan + vAtlas;

  // The instance's own axes. Rotating the baked normal by these is what lets
  // every print be lit from the same sun however it is turned.
  vTan = normalize(finalWorld[0].xyz);
  vBit = normalize(finalWorld[2].xyz);
  // The quad is tilted onto the ground's slope, so "up" is its own Y column
  // rather than the world's.
  vNrm = normalize(finalWorld[1].xyz);
  vView = cameraPosition - worldPos.xyz;

  gl_Position = viewProjection * worldPos;
}
`;

const FRAGMENT = `
precision highp float;

varying vec2 vUV;
varying vec4 vColor;
varying vec2 vAtlas;
varying vec3 vTan;
varying vec3 vBit;
varying vec3 vNrm;
varying vec3 vView;

uniform sampler2D soleSampler;
uniform vec3 sunDir;
// Colour this kind of print tends toward at full depth. A uniform now: it was
// per-instance, and it was the same for every instance of a kind.
uniform vec3 soleTint;
// x: relief reach in uv, y: ao strength, z: ambient, w: rim gain.
// These are uniforms rather than GLSL constants so FOOTPRINT_TUNING can move
// them live without recompiling the effect.
uniform vec4 soleParams;

const int RELIEF_STEPS = 12;
const int SHADOW_STEPS = 6;

/**
 * How much of the atlas one sole spans, and half a texel of it — so a clamped
 * fetch cannot bilinearly pick up the sole next door. Both are uniforms now:
 * the atlas is a grid of variants by track shape and its size depends on how
 * many shapes the kind has.
 */
uniform vec2 atlasSpan;
uniform vec2 atlasEdge;

/**
 * Longest march allowed, as a fraction of ONE CELL.
 *
 * Measured in cell space rather than atlas space on purpose: it is a limit on
 * how far the ray may walk across the sole, and the sole is the cell.
 */
const float SWEEP_MAX = 0.45;

/** Hold a sample inside this print's own cell of the atlas. */
vec2 soleUV(vec2 p) {
  return clamp(p, vAtlas + atlasEdge, vAtlas + atlasSpan - atlasEdge);
}

/** Cap a march in cell space, then take it into the atlas' own scale. */
vec2 toAtlas(vec2 cell) {
  float len = length(cell);
  return (len > SWEEP_MAX ? cell * (SWEEP_MAX / len) : cell) * atlasSpan;
}

void main() {
  vec3 view = normalize(vView);

  // View in the print's own frame. The lateral part over the part along the
  // surface normal is how far across the texture the eye travels per unit of
  // depth.
  vec2 viewT = vec2(dot(view, vTan), dot(view, vBit));
  float viewUp = max(dot(view, vNrm), 0.08);

  // Cap it at what fits inside this sole.
  //
  // A march that leaves the sub-rect finds no sole out there, only the border
  // soleUV() clamps it to - and the border is outside the outline, so it
  // returns coverage 0 and the print silently disappears. That is a bad way to
  // fail, and an especially bad one because the sweep length depends on the
  // view angle and on the tilt of the ground under the print: it does not fail
  // everywhere, it fails on some prints some of the time, which reads as them
  // blinking in and out for no reason.
  //
  // Capping costs a little parallax at a grazing angle. That is the right
  // trade against losing the print altogether.
  vec2 sweep = toAtlas((viewT / viewUp) * soleParams.x);

  // Relief march: walk down through depth layers until the height field rises
  // above the ray. A single offset only shifts the picture; this hides the
  // near wall behind its own rim and brings the far wall into view.
  float layerStep = 1.0 / float(RELIEF_STEPS);
  vec2 uvStep = sweep * layerStep;

  // R is signed height biased to 0.5, so depth below the surface is
  // (1 - 2R) and height above it is (2R - 1).
  vec2 uv = vUV;
  float rayDepth = 0.0;
  float texDepth = max(0.0, 1.0 - 2.0 * texture2D(soleSampler, soleUV(uv)).r);

  for (int i = 0; i < RELIEF_STEPS; i++) {
    if (rayDepth >= texDepth) break;
    uv -= uvStep;
    texDepth = max(0.0, 1.0 - 2.0 * texture2D(soleSampler, soleUV(uv)).r);
    rayDepth += layerStep;
  }

  // One linear refinement between the last two layers, so the wall does not
  // come out in visible bands.
  vec2 prevUV = uv + uvStep;
  float after = texDepth - rayDepth;
  float before =
      max(0.0, 1.0 - 2.0 * texture2D(soleSampler, soleUV(prevUV)).r) -
      (rayDepth - layerStep);
  uv = soleUV(mix(uv, prevUV, clamp(after / (after - before + 1e-5), 0.0, 1.0)));

  vec4 sole = texture2D(soleSampler, uv);
  float signedHeight = sole.r * 2.0 - 1.0;
  float depth = max(0.0, -signedHeight);
  float coverage = sole.a;

  float nx = sole.g * 2.0 - 1.0;
  float nz = sole.b * 2.0 - 1.0;
  float ny = sqrt(max(0.0, 1.0 - nx * nx - nz * nz));
  vec3 normal = normalize(vTan * nx + vNrm * ny + vBit * nz);

  // Self-shadowing rim: march toward the sun and see whether the ridge the
  // boot pushed up gets in the way, so the rim lays a real shadow across the
  // inside of the print.
  vec2 lightT = vec2(dot(sunDir, vTan), dot(sunDir, vBit));
  float lightUp = max(dot(sunDir, vNrm), 0.08);
  // Capped the same way the view march is. Uncapped it walks out of the cell
  // at a grazing sun, and every sample then clamps to the border — which is
  // outside the outline and so reads as flat, undisturbed snow. Against a ray
  // that is below the surface that scores as fully blocked, so a print in a
  // low sun went dark for a reason that was entirely an artefact of the atlas.
  vec2 lightSweep = toAtlas((lightT / lightUp) * soleParams.x);

  float blocked = 0.0;

  for (int i = 1; i <= SHADOW_STEPS; i++) {
    float t = float(i) / float(SHADOW_STEPS);
    float alongRay = depth * (1.0 - t);
    float here = max(
      0.0,
      1.0 - 2.0 * texture2D(soleSampler, soleUV(uv + lightSweep * t)).r
    );
    blocked = max(blocked, (alongRay - here) * (1.0 - t));
  }

  // Smoothstepped and shallow: a hard cut here is what made the interior read
  // as one solid blob instead of a gradient running down the wall.
  float selfShadow = 1.0 - smoothstep(0.0, 1.0, blocked * 1.8) * 0.5;

  // Deliberately high. A print in snow is not a dark hole: snow is close to a
  // perfect diffuser and a cavity's walls bounce light into each other, so
  // even a wall turned right away from the sun keeps most of its brightness.
  // Depth is read from the *pairing* of a lit rim against a mid-tone floor,
  // which is why the rim below may add light. Dropping this is what turned an
  // earlier cut into black ovals.
  float ambient = soleParams.z;

  float lambert = max(dot(normal, sunDir), 0.0) * selfShadow;
  float lit = ambient + (1.0 - ambient) * lambert;
  float flatLit = ambient + (1.0 - ambient) * max(dot(vNrm, sunDir), 0.0);

  // How much of the ground survives, measured against what undisturbed snow
  // beside it would have caught. 1 means untouched.
  float keep = lit / max(0.08, flatLit) * (1.0 - soleParams.y * depth);

  // Snow the boot pushed up, above the original surface.
  float raised = max(0.0, signedHeight);

  // Rim light: the crest is tilted up into the sun and catches it square on,
  // which is the cue that says the snow was displaced rather than merely
  // pressed. This is additive, so it can go brighter than the snow beside it.
  float rim = raised * max(dot(normal, sunDir), 0.0) * soleParams.w;

  // Subsurface: snow is translucent, so light entering a thin displaced ridge
  // scatters through and leaves the far side glowing instead of going flat
  // dark. Keyed to the side facing away from the sun.
  // Subsurface rides at a little over half the rim: it is the same displaced
  // snow, seen from its unlit side.
  float sss = raised * max(0.0, -dot(normal, sunDir)) * soleParams.w * 0.55;

  vec3 tint = mix(vec3(1.0), soleTint, depth);

  // vColor.z is this print's own brightness, a small wobble either side of 1.
  // Four sole shapes stop a trail repeating its outline; this stops it
  // repeating its *weight*, which is the other half of what gives away a
  // stamped decal. Costs nothing - the channel was already there.
  float strength = coverage * vColor.a * vColor.z;

  // Premultiplied blend: dst * (1 - a) + rgb. The (1 - a) half is a
  // *proportional* darkening -- correct inside a shadow and on half-covered
  // ground, exactly as the multiply blend was -- and the rgb half adds light
  // on top, which multiply could never do. That is what buys the bright rim.
  //
  // There is only one alpha for three channels, and expressing a per-channel
  // tint through it would need to know what the ground already drew, which a
  // blend cannot tell us. So the *most* darkened channel goes through the
  // alpha, and the other two are handed back the difference as light. That is
  // exact where the ground is bright, which is the case this exists for (snow
  // at ~0.93); on darker stone it over-corrects the hue slightly, which is a
  // fair trade for one pass and no assumption about the surface.
  float floorTint = min(tint.r, min(tint.g, tint.b));
  float keepScalar = clamp(keep * floorTint, 0.0, 1.0);

  float alpha = (1.0 - keepScalar) * strength;
  vec3 hue = keep * (tint - vec3(floorTint)) * strength;

  vec3 add = hue + vec3(rim + sss) * strength;

  gl_FragColor = vec4(add, alpha);
}
`;

/** World-space direction toward the sun, from the key rig. */
function sunDirection(scene: Scene): Vector3 {
  // The rig creates it pointing (0.4, -1, 0.6); we want the other way.
  const d = sunLightOf(scene)?.direction ?? new Vector3(0.4, -1, 0.6);
  return new Vector3(-d.x, -d.y, -d.z).normalize();
}

/**
 * One material per kind, built on demand.
 *
 * Only ever one is in use: a map is either a snow map or a wet map, never
 * both, so the mesh swaps its material rather than paying for a second draw
 * call. A map change clears the pool, so no print ever outlives its own sole.
 */
/**
 * A kind's material, its sole atlas, and which rows of that atlas have
 * actually been baked.
 *
 * The rows are baked lazily (`ensureShape`). Six silhouettes times four
 * variants is about a quarter of a million texels of value noise, and most
 * sessions press two or three shapes into the ground; paying for the spiders
 * and the hooves the first time it snows is a stall for nothing. An unbaked
 * row is all zeroes, which is coverage 0 — a print drawn from it would be
 * invisible rather than wrong, and `ensureShape` runs before any print can
 * claim a cell in it.
 */
type SoleAtlas = {
  material: ShaderMaterial;
  texture: RawTexture;
  data: Uint8Array;
  baked: Set<TrackShape>;
};

const materials = new Map<PrintKind, SoleAtlas>();

/**
 * Bake this shape's row if it has not been baked, and push the atlas.
 *
 * The whole texture goes up rather than the row's sub-rectangle: it happens
 * at most six times per kind per map, and a `texSubImage2D` with the cell
 * arithmetic done wrong fails as prints that are silently invisible, which is
 * the worst way for this to break. `RawTexture.update` cannot get it wrong.
 */
function ensureShape(atlas: SoleAtlas, kind: PrintKind, shape: TrackShape): void {
  if (atlas.baked.has(shape) || shapeRow(shape) < 0) return;

  atlas.baked.add(shape);
  writeShape(atlas.data, kind, shape);
  atlas.texture.update(atlas.data);
}

function materialFor(scene: Scene, kind: PrintKind): ShaderMaterial {
  return atlasFor(scene, kind).material;
}

function atlasFor(scene: Scene, kind: PrintKind): SoleAtlas {
  const existing = materials.get(kind);
  if (existing && existing.material.getScene() === scene) return existing;

  const material = new ShaderMaterial(
    `_footprints_${kind}`,
    scene,
    { vertexSource: VERTEX, fragmentSource: FRAGMENT },
    {
      // Just the mesh's own. Babylon appends world0..3 and instanceColor
      // itself once it sees the mesh has thin instances with a colour buffer.
      attributes: ['position', 'uv'],
      uniforms: [
        'world',
        'viewProjection',
        'cameraPosition',
        'sunDir',
        'soleParams',
        'soleTint',
        'atlasSpan',
        'atlasEdge',
      ],
      samplers: ['soleSampler'],
      needAlphaBlending: true,
    }
  );

  const width = atlasWidth();
  const height = atlasHeight(kind);

  // Empty: every row is baked on demand by `ensureShape`.
  const data = new Uint8Array(width * height * 4);

  const texture = RawTexture.CreateRGBATexture(
    data,
    width,
    height,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );
  texture.name = `footprintSole_${kind}`;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;

  material.setTexture('soleSampler', texture);
  material.setVector3('sunDir', sunDirection(scene));
  const tint = TINT[kind];
  material.setVector3('soleTint', new Vector3(tint[0], tint[1], tint[2]));

  const [spanU, spanV] = atlasSpan(kind);
  material.setVector2('atlasSpan', new Vector2(spanU, spanV));
  // Half a texel in, so a bilinear fetch at the edge of a cell cannot pick up
  // the sole next door.
  material.setVector2('atlasEdge', new Vector2(0.5 / width, 0.5 / height));

  material.setVector4(
    'soleParams',
    new Vector4(
      // Relief reach in CELL uv: the hollow's depth as a fraction of the
      // quad's own length, which is the axis the march mostly runs along. The
      // shader takes it into atlas scale itself (`toAtlas`), because that
      // scale is now a vec2 — the grid is variants across by shapes down and
      // is no longer square.
      //
      // Getting this scale wrong is what made every print vanish when the
      // atlas first went in: a reach measured against the whole texture
      // overshot the cell on the first march step, soleUV() clamped it to the
      // border, and the border is outside the outline - coverage 0, alpha 0,
      // nothing drawn. The clamp was doing its job; it was being handed a ray
      // that had no business leaving.
      FOOTPRINT_TUNING.depth / quadLength(),
      FOOTPRINT_TUNING.ao,
      FOOTPRINT_TUNING.ambient,
      FOOTPRINT_TUNING.rim
    )
  );

  material.backFaceCulling = false;
  material.alphaMode = Constants.ALPHA_PREMULTIPLIED;
  material.disableDepthWrite = true;
  // Pull the decal toward the camera in depth so it wins against the terrain
  // it is lying on without needing a bigger Z_LIFT.
  material.zOffset = -8;

  material.onDisposeObservable.addOnce(() => texture.dispose());

  const atlas: SoleAtlas = { material, texture, data, baked: new Set() };
  materials.set(kind, atlas);

  return atlas;
}

function ensurePool(scene: Scene, kind: PrintKind, lane: PrintLane): Pool {
  const key = poolKey(kind, lane);
  const existing = pools.get(key);
  if (existing && !existing.mesh.isDisposed() && existing.mesh.getScene() === scene) {
    return existing;
  }

  const size = POOL[lane];
  const plane = CreatePlane(`_footprints_${kind}_${lane}`, { size: 1 }, scene);
  // Babylon's plane faces +Z; the ground is the XZ plane, so tip it flat.
  plane.rotation.x = Math.PI / 2;
  plane.bakeCurrentTransformIntoVertices();
  plane.isPickable = false;
  plane.alwaysSelectAsActiveMesh = true;
  plane.doNotSyncBoundingInfo = true;

  const matrixData = new Float32Array(size * 16);
  const colourData = new Float32Array(size * 4);

  const prints: Print[] = [];
  for (let i = 0; i < size; i++) {
    prints.push({
      age: -1,
      life: 1,
      strength: 0,
      kind,
      shape: 'boot',
      matrix: Matrix.Identity(),
      atlasU: 0,
      atlasV: 0,
      shade: 1,
    });
  }

  plane.thinInstanceSetBuffer('matrix', matrixData, 16, false);
  plane.thinInstanceSetBuffer('color', colourData, 4, false);
  plane.thinInstanceCount = size;

  // After the buffers: the material's defines are decided from what the mesh
  // has, and INSTANCESCOLOR only appears once the colour buffer is registered.
  plane.material = materialFor(scene, kind);
  plane.setEnabled(false);

  const pool: Pool = {
    mesh: plane,
    matrixData,
    colourData,
    prints,
    size,
    next: 0,
    dirty: true,
  };

  pools.set(key, pool);

  return pool;
}

/**
 * Claim the next slot in a pool and write its transform.
 *
 * `ux/uy/uz` is the ground's own normal. A decal held flat while the terrain
 * tilts underneath has to be lifted far enough to clear its high side, and
 * that lift is exactly what reads as the print hovering above the snow.
 */
/**
 * How close two prints have to be, in tiles, before the second is taken as the
 * same footfall rather than a new one.
 *
 * Under the width of a print, so two feet side by side (SIDE * 2, about 0.44
 * apart) and two consecutive strides (STRIDE, 0.5) are never mistaken for each
 * other. Only actually walking back over your own hole trips it.
 */
const MERGE_DIST = 0.22;

/**
 * Deepen a print already in the ground, if this footfall landed on one.
 *
 * Pacing back and forth over the same line used to stack a fresh decal on top
 * of every old one. With premultiplied blending that composites - each pass
 * darkens again - so a patch anyone had crossed twice turned into a solid mess
 * of overlapping holes instead of a path worn into the snow.
 *
 * Treading the same hole again does not make a second hole. It makes the one
 * that is there deeper, and resets how long it has left. So that is what this
 * does: the strength climbs toward full and the age goes back to zero, and the
 * existing matrix is kept so the print does not jump as it is re-trodden.
 */
function deepenExisting(
  pool: Pool,
  kind: PrintKind,
  shape: TrackShape,
  x: number,
  z: number,
  strength: number
): boolean {
  for (let i = 0; i < pool.size; i++) {
    const print = pool.prints[i];
    // Only a print of the same silhouette. A hound crossing the hero's trail
    // treads *near* a boot mark, not into it, and deepening one shape with
    // another would be the one place the two get confused.
    if (print.age < 0 || print.kind !== kind || print.shape !== shape) continue;

    const m = print.matrix.m;
    const dx = m[12] - x;
    const dz = m[14] - z;

    if (dx * dx + dz * dz > MERGE_DIST * MERGE_DIST) continue;

    print.age = 0;
    // Half, not all: the second pass through a hole does much less than the
    // first did, because the snow it would have displaced is already gone.
    print.strength = Math.min(1, print.strength + strength * 0.5);
    pool.dirty = true;

    return true;
  }

  return false;
}

function place(
  pool: Pool,
  kind: PrintKind,
  shape: TrackShape,
  x: number,
  y: number,
  z: number,
  angle: number,
  width: number,
  length: number,
  strength: number,
  up: { x: number; y: number; z: number }
): void {
  if (deepenExisting(pool, kind, shape, x, z, strength)) return;

  const print = pool.prints[pool.next];
  pool.next = (pool.next + 1) % pool.size;

  print.age = 0;
  print.life = LIFE[kind];
  print.strength = Math.min(1, strength);
  print.kind = kind;
  print.shape = shape;

  // Which of the four soles, and how heavily it fell. Random per print rather
  // than cycling: a cycle of four is itself a pattern, and at this size the
  // eye finds a repeating four-step rhythm about as fast as it finds one shape.
  const variant = Math.floor(Math.random() * VARIANTS) % VARIANTS;
  const [au, av] = cellOffset(kind, shape, variant);
  print.atlasU = au;
  print.atlasV = av;
  print.shade = 0.86 + Math.random() * 0.28;

  // Nobody plants a foot exactly along their heading, and nobody's two feet
  // land with the same weight. A few degrees of yaw and a few percent of size,
  // independently per axis, so even the same sole twice running does not
  // present the same outline.
  // Not for the trench: its pieces overlap end to end into one channel, and
  // a yaw or a width step between two pieces is a visible kink in it.
  if (kind !== 'drag') {
    angle += (Math.random() - 0.5) * 0.26;
    width *= 0.93 + Math.random() * 0.14;
    length *= 0.93 + Math.random() * 0.14;
  }

  const nl = Math.hypot(up.x, up.y, up.z) || 1;
  const ux = up.x / nl;
  const uy = up.y / nl;
  const uz = up.z / nl;

  // Walk direction, flattened onto the ground plane so the print lies in it.
  let fx = Math.sin(angle);
  let fy = 0;
  let fz = Math.cos(angle);
  const along = fx * ux + fy * uy + fz * uz;
  fx -= ux * along;
  fy -= uy * along;
  fz -= uz * along;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;

  // Right = up x forward, matching the flat case where X was (cos, 0, -sin).
  const rx = uy * fz - uz * fy;
  const ry = uz * fx - ux * fz;
  const rz = ux * fy - uy * fx;

  const m = print.matrix.m as unknown as Float32Array;
  m[0] = rx * width;
  m[1] = ry * width;
  m[2] = rz * width;
  m[3] = 0;
  m[4] = ux;
  m[5] = uy;
  m[6] = uz;
  m[7] = 0;
  m[8] = fx * length;
  m[9] = fy * length;
  m[10] = fz * length;
  m[11] = 0;
  // Lift along the ground's normal, not straight up, so the clearance is the
  // same all the way round however the ground is tilted.
  m[12] = x + ux * Z_LIFT;
  m[13] = y + uy * Z_LIFT;
  m[14] = z + uz * Z_LIFT;
  m[15] = 1;
  print.matrix.markAsUpdated();

  pool.dirty = true;
}

/** Everything one print needs. An object because there are now eleven of them. */
export interface FootprintSpec {
  x: number;
  y: number;
  z: number;
  /** Walk heading in radians about Y. */
  angle: number;
  kind: PrintKind;
  /** Which silhouette to press — the creature's, from `recipes.ts`. */
  shape: TrackShape;
  /** How strongly it takes; where the drying boot enters (`footprintSystem`). */
  strength: number;
  /**
   * How far the foot sank, and how big it is. Scales the quad **uniformly**,
   * which is not just cosmetic: the relief march works in UV against a fixed
   * reach, so a quad twice as wide is a hollow twice as deep in world terms as
   * well. One number therefore gets both halves of "deeper snow, bigger and
   * deeper print", and the same one gets "a bigger creature presses harder",
   * without a second per-instance channel.
   */
  scale?: number;
  /** The ground's own normal under the foot. */
  up?: { x: number; y: number; z: number };
  /** Which ring it goes in. The hero has one to itself — see `POOL`. */
  lane?: PrintLane;
}

/**
 * Lay a print down.
 *
 * The shape's row of the sole atlas is baked here, on the first print that
 * asks for it, so nothing is generated for a silhouette nothing in the world
 * ever presses.
 */
export function addFootprint(scene: Scene, spec: FootprintSpec): void {
  const { kind, shape, strength } = spec;

  if (strength <= 0 || shapeRow(shape) < 0) return;

  const scale = spec.scale ?? 1;

  ensureShape(atlasFor(scene, kind), kind, shape);

  place(
    ensurePool(scene, kind, spec.lane ?? 'crowd'),
    kind,
    shape,
    spec.x,
    spec.y,
    spec.z,
    spec.angle,
    quadWidth(shape) * scale,
    quadLength() * scale,
    strength,
    spec.up ?? UP
  );
}

/**
 * Default trough width in tiles, for callers that do not say. The walk gait
 * in footprintSystem.ts passes its own: a trench wide enough to hold both
 * feet and the snow shouldered out of it.
 */
const DRAG_WIDTH = 0.3;

/**
 * Join two footfalls with a shallow trough.
 *
 * This is the difference between a row of separate holes and a trail: in snow
 * deep enough to sink into, the boot does not clear the surface between steps,
 * it ploughs through it. Called from the same stride that lays the print, with
 * the previous footfall's position.
 *
 * Length is the gap plus a little, so each end runs under the print it joins
 * instead of stopping short of it and leaving a visible seam.
 */
export function addDragMark(
  scene: Scene,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  y: number,
  strength: number,
  up: { x: number; y: number; z: number } = UP,
  width: number = DRAG_WIDTH
): void {
  if (strength <= 0 || width <= 0) return;

  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const gap = Math.hypot(dx, dz);

  if (gap < 1e-3) return;

  ensureShape(atlasFor(scene, 'drag'), 'drag', 'boot');

  place(
    ensurePool(scene, 'drag', 'hero'),
    'drag',
    'boot',
    (fromX + toX) * 0.5,
    y,
    (fromZ + toZ) * 0.5,
    Math.atan2(dx, dz),
    width,
    // Well over the gap, so every piece runs deep into both neighbours and
    // the end tapers cross-fade rather than meeting.
    gap * 1.7,
    strength,
    up
  );
}

/** Ages every print and pushes the instance buffers. Call once a frame. */
export function updateFootprints(dt: number): void {
  for (const pool of pools.values()) {
    const { prints, matrixData, colourData } = pool;
    let live = 0;

    for (let i = 0; i < pool.size; i++) {
      const print = prints[i];
      const o = i * 4;

      if (print.age < 0) {
        colourData[o + 3] = 0;
        continue;
      }

      print.age += dt;

      if (print.age >= print.life) {
        print.age = -1;
        colourData[o + 3] = 0;
        pool.dirty = true;
        continue;
      }

      live++;

      const t = print.age / print.life;
      // Flat for the first stretch, then out: a print does not start fading
      // the instant it is made.
      const remaining =
        t <= 1 - FADE_TAIL ? 1 : Math.max(0, (1 - t) / FADE_TAIL);

      matrixData.set(print.matrix.asArray(), i * 16);
      // (atlas u, atlas v, brightness, alpha). The tint that used to live in
      // rgb was identical for every instance of a kind and is a uniform now.
      colourData[o] = print.atlasU;
      colourData[o + 1] = print.atlasV;
      colourData[o + 2] = print.shade;
      colourData[o + 3] = PEAK[print.kind] * print.strength * remaining;

      pool.dirty = true;
    }

    pool.mesh.setEnabled(live > 0);

    if (!pool.dirty) continue;
    pool.dirty = false;

    pool.mesh.thinInstanceBufferUpdated('matrix');
    pool.mesh.thinInstanceBufferUpdated('color');
  }
}

/** Wipe the trail — a map change or a teardown. */
export function resetFootprints(): void {
  for (const pool of pools.values()) {
    for (const print of pool.prints) print.age = -1;
    pool.next = 0;
    pool.colourData.fill(0);
    pool.mesh.setEnabled(false);
    pool.mesh.thinInstanceBufferUpdated('color');
    pool.dirty = false;
  }
}

/**
 * Rebuild everything from the current `FOOTPRINT_TUNING`.
 *
 * The soles are generated once into a texture and the materials bind their
 * parameters once, so a change to the tuning has to throw both away. Prints
 * already on the ground go with them — they were drawn with the old numbers
 * and keeping them would show two looks at once.
 */
export function applyFootprintTuning(): void {
  for (const pool of pools.values()) pool.mesh.dispose();
  pools.clear();

  for (const atlas of materials.values()) atlas.material.dispose();
  materials.clear();
}

/**
 * Dial the look live from the browser console:
 *
 *   muFootprints.get()                        // current numbers
 *   muFootprints.set({ length: 0.7 })         // change some and rebuild
 *   muFootprints.reset()                      // back to the defaults
 *
 * Registered unconditionally: it costs one property on `window`, and a look
 * this fiddly is worth being able to find without a rebuild.
 */
const DEFAULTS = { ...FOOTPRINT_TUNING, tint: [...FOOTPRINT_TUNING.tint] };

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).muFootprints = {
    get: () => ({ ...FOOTPRINT_TUNING }),
    set(next: Partial<typeof FOOTPRINT_TUNING>) {
      Object.assign(FOOTPRINT_TUNING, next);
      applyFootprintTuning();
      return { ...FOOTPRINT_TUNING };
    },
    reset() {
      Object.assign(FOOTPRINT_TUNING, DEFAULTS, {
        tint: [...DEFAULTS.tint] as [number, number, number],
      });
      applyFootprintTuning();
      return { ...FOOTPRINT_TUNING };
    },
  };
}

/** Live print count across every pool. For tests. */
export function footprintCount(): number {
  let n = 0;
  for (const pool of pools.values()) {
    for (const print of pool.prints) if (print.age >= 0) n++;
  }
  return n;
}

/**
 * The layer (see layer.ts). Reset only: prints are laid by `FootprintSystem`
 * from the hero's stride, and aged by `updateFootprints` from there, because
 * they need the scene and the hero, which the weather tick does not have.
 */
// ---- 3. the layer ----------------------------------------------------------

export const footprintsLayer: WeatherLayer = {
  name: 'footprints',
  reset: resetFootprints,
};
