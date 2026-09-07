import {
  BoundingInfo,
  Mesh,
  ShaderMaterial,
  VertexData,
  Vector3,
  type IVector3Like,
  type Scene,
} from '../babylon/exports';
import { TERRAIN_SIZE, TWFlags } from '../../common/terrain/consts';
import { isFlagInBinaryMask } from '../../common/utils';
import { TERRAIN_INDEX } from '../../common/terrain/utils';
import { registerTerrainMaterial } from '../../scenes/shadows';
import { CLOUD_UNIFORMS } from '../../lighting/clouds';
import { ENUM_WORLD } from '../../common/types';
import { GameOptions } from '../../common/gameOptions';
import { tierIndex } from '../../common/lightingQuality';
import { GRASS_CARD_SLOTS, type GrassCards } from './terrainGrassCards';
import { SNOW_COVER } from './terrainOverlay';
import { snowCover } from '../../weather/snowCover';
import { GROUND_WIND } from '../../weather/ambientWeather';
import {
  grassBurnActive,
  grassBurnTexture,
  setGrassProbe,
  setGroundProbe,
} from '../../weather/grassBurn';
import { lookDirector } from '../../lighting/director';
import { devQueryNumber } from '../../common/devSeams';
import { LUMA_GLSL } from '../../lighting/lightTint';
import {
  TERRAIN_CSM_SAMPLERS,
  TERRAIN_LIGHT_UNIFORMS,
  bindTerrainLight,
  terrainGroundLightGlsl,
  terrainLightDeclarationsGlsl,
  terrainLightDefines,
  terrainLightSamplers,
  terrainSkyLightGlsl,
} from './terrainLighting';

/**
 * The grass layer: blades standing on the tiles the splat map already draws
 * as grass.
 *
 * The original had this pass and the clone never ported it -
 * `TERRAIN_MAP_GRASS` is a constant nothing reads. `RenderTerrainFace` drew
 * one vertical alpha-tested card per grass tile from `TileGrass01/02/03`
 * (ZzzLodTerrain.cpp:1620-1675). This is that layer with the card replaced by
 * geometry: real blades are opaque, so the whole layer costs no transparency,
 * no sorting and no alpha test, and a cutout pass over the ground is by far
 * the more expensive of the two.
 *
 * Lit entirely through `terrainLighting.ts` - the same bake, torches,
 * cascades and roof mask the tile under each blade takes. A blade that is a
 * shade off the ground it grows from is more obviously wrong than either
 * would be alone, so there is no second opinion about the light here.
 */

/** Tiles per block edge. 256 blocks over the map. */
const BLOCK_TILES = 16;
const BLOCKS_PER_SIDE = TERRAIN_SIZE / BLOCK_TILES;

/**
 * Blades on a fully-grass tile, by `grassDensity`. Index 0 never builds.
 *
 * Sized from the frame, not from a round number: at 22 (what index 5 used to
 * be) a Lorencia field reads as scattered straw, and it takes the mid 30s
 * before it reads as ground cover. The default sits there and the curve runs
 * either side of it.
 */
const BLADES_PER_TILE = [0, 8, 16, 26, 40, 56, 76, 102, 136, 180] as const;

/**
 * Blade width at the root, world units (a tile is 1m). Real grass is nearer
 * 3mm, which at this camera is a sub-pixel sliver that aliases into a dot;
 * 18mm against a 25-45cm height is the ratio that still reads as a blade.
 */
const BLADE_WIDTH = 0.018;

/** Blade height range, world units; the hash picks within it. */
const BLADE_MIN_H = 0.25;
const BLADE_MAX_H = 0.45;

/**
 * Where blades start shrinking and where they reach zero, in tiles. The fade
 * is a scale, not an alpha ramp: the layer is opaque and stays that way.
 */
const FADE_START = 26;
const FADE_END = 34;

/**
 * Blocks are resident while their *nearest* corner is inside this. Past
 * `FADE_END` every blade in a block is already scaled to nothing, so the
 * margin is hysteresis against thrashing at the boundary and nothing more -
 * it was a full block width, which held a ring of blocks whose every blade
 * was invisible and tripled the resident instance count for no pixels.
 */
const RESIDENT_RANGE = FADE_END + 4;

/**
 * The wind, as waves crossing the field.
 *
 * The first cut had the original's shape - `sin(WindSpeed + xf * 5)`,
 * ZzzLodTerrain.cpp:2430 - with a per-blade phase added on top, and that is
 * exactly what stops it reading as wind: a wave whose phase is randomised per
 * blade is not a wave, it is jitter. Neighbours have to move *together* for
 * the eye to see anything travel.
 *
 * So: a plane wave along `GROUND_WIND`, `sin(t*rate - dot(xz, dir)*freq)`,
 * broad enough that a crest spans several tiles. The two-tone banding a real
 * field shows comes free from that - blades leaning into the wind turn a
 * different face to the sun than blades standing up, and the form shading
 * above turns that into light and dark bands travelling with the crest.
 *
 * `CHOP` is a second, finer, faster wave carrying a small per-blade offset,
 * so the field is not a rigid sheet. It is deliberately weak: it is texture
 * on the wave, not the wave.
 */
const WAVE_RATE = 1.15;
/** Radians per tile: 2*pi/0.42 is a crest about 15 tiles apart. */
const WAVE_FREQ = 0.42;
const WAVE_BEND = 0.26;

const CHOP_RATE = 3.1;
const CHOP_FREQ = 1.9;
const CHOP_BEND = 0.05;

/** How much the wave leans a blade even where it is not cresting. */
const WIND_BIAS = 0.1;

/**
 * Root and tip against the tile's own colour. The root is darkened as cheap
 * contact occlusion (a blade base sits in shade the ground never gets), the
 * tip lifted because it is the part that catches the sky.
 *
 * The root was 0.45, which is about right for a blade seen side-on and quite
 * wrong here: the blade tapers, so most of its *area* is in the bottom third,
 * and against Lorencia's bright ground a field of them read as black spikes
 * rather than as grass. Measured, the blades came back at 0.53 of the ground
 * they stood on where their albedo ratio alone predicted 0.8.
 */
const ROOT_TINT = 0.74;
const TIP_TINT = 1.35;

/** Per-blade brightness spread, so a field is not one flat tone. */
const TINT_JITTER = 0.18;

/**
 * Settled snow, on the grass as well as on the ground.
 *
 * The ground under a Devias blade is whitened by the `SNOW_COVER` overlay
 * (terrainOverlay.ts) - which is the clone's own addition, not the original's.
 * The grass took none of it, so blades measured 0.84 of the ground they stood
 * in and read as dark blue streaks over a white field. Snow that lies on the
 * ground lies on what grows out of it too: the blade takes the same coverage,
 * whitening toward the overlay's own colour and shortening as it is buried.
 *
 * Following terrainOverlay's rule, the colour is a literal and only the
 * coverage is a uniform, so a uniform that never reaches the GPU reads as
 * zero and means *no snow* - the safe state, not a white field.
 */
const SNOW_COLOUR = SNOW_COVER.colour;
/** How far toward snow-white a blade goes at full cover. */
const SNOW_ON_GRASS = 0.85;
/** What is left of a blade's height at full cover: the rest is buried. */
const SNOW_BURY = 0.55;

/**
 * The detailed blade's resting arc: how far the tip leans out, as a fraction
 * of the blade's height, from nearly upright to well over. The spread is the
 * point - a field where every blade curves the same amount reads as combed.
 */
const ARC_MIN = 0.15;
const ARC_MAX = 0.85;
/** How much of the lean comes out of the blade's height (it cannot do both). */
const ARC_DROOP = 0.45;

/**
 * Fire, as the blade sees it (`weather/grassBurn.ts` owns the scar itself).
 *
 * Disintegration rather than a shrink. Each blade goes when the burn at its
 * root passes *its own* threshold, drawn from the hash it already carries, so
 * a patch thins out blade by blade instead of sinking like a sheet - and
 * because the threshold is a pure function of the blade, the same blades
 * always go first and the edge does not crawl about as the map decays.
 *
 * Thresholds run over MIN to MIN + SPREAD on the *cube* of the hash, and the
 * curve is the point. SPREAD carries the top of the range past 1, so a fully
 * burnt patch keeps the blades whose threshold the fire never reached and
 * leaves them standing and charred - with every threshold under 1 a full burn
 * took every blade and the scar was bare ground, which reads as a hole in the
 * field rather than as something burnt. But spreading them evenly to get that
 * stubble left a third of the field standing and the scar stopped reading at
 * all. Cubed, about three quarters go outright and a sixth stay: a clear scar
 * with something burnt still standing in it. `WITHER` is how much
 * more burn it takes for a blade to go from whole to gone, which is what
 * keeps the edge soft at a scale finer than the map's 25 cm texel.
 */
const BURN_MIN = 0.05;
const BURN_SPREAD = 1.6;
const BURN_WITHER = 0.25;

/**
 * What a blade chars toward on its way out, and how far it gets. Not quite
 * black: charred grass keeps a little brown, and true black against Lorencia's
 * ground reads as a hole in the terrain rather than as burnt.
 */
const CHAR_COLOUR = [0.08, 0.06, 0.045] as const;
const CHAR_TINT = 0.85;

/**
 * The dissolve edge travelling down a burning blade.
 *
 * `RIM` is how much of the blade is glowing ember at the cut and `CHAR` how
 * much is blackened behind it, both as a fraction of the blade's length. The
 * rim is deliberately thin: it is a line of fire, and widening it turns the
 * whole blade orange, which reads as a lit blade rather than a burning one.
 *
 * `WOBBLE` and `FREQ` bend the cut per blade off its own hash, so a burning
 * patch does not go as one straight line drawn across the field.
 */
const DISSOLVE_RIM = 0.055;
const DISSOLVE_CHAR = 0.22;
const DISSOLVE_WOBBLE = 0.045;
const DISSOLVE_FREQ = 7;

/** The ember line itself. Above 1 so the bloom pass has something to catch. */
const EMBER_COLOUR = [2.6, 0.85, 0.18] as const;

/** Tufts per tile, and how far a blade strays from its tuft, in tiles. */
const CLUMPS_PER_TILE = 4;
const CLUMP_SPREAD = 0.34;

/**
 * Form shading on the detailed blade: how far a face turned toward the sun
 * sits above one turned away.
 *
 * This is the difference between a field of curved shapes and a field of
 * grass - without it every blade is the same value and the whole thing reads
 * flat. It is written to be **albedo-preserving**: the term runs from
 * `1 - FORM` to `1 + FORM` across `0.5 + 0.5 * dot(n, sun)`, and blade yaw is
 * a uniform hash, so the field's mean is 1 and the layer neither brightens
 * nor darkens the frame.
 *
 * That property is what keeps it out of the lighting model. It redistributes
 * light across a blade's own two faces - which flat ground does not have and
 * a lightmap cannot express - rather than adding a second opinion about how
 * much light is here. `terrainLighting.ts` remains the only writer of that.
 */
const FORM_SHADE = 0.34;
/** How far the fragment rounds the normal across the blade's width. */
const BLADE_ROUND = 0.55;

/**
 * How far a blade is pulled toward the colour of the light passing *through*
 * it, at the tip where it is thinnest.
 *
 * A blade is `albedo x groundLit`, and a saturated green albedo has almost no
 * blue in it: a violet spell can light the tile, the dirt path and the pale
 * props around it and the field still reads green, because green is all the
 * albedo can reflect. That is right for reflection and wrong for a blade,
 * which is thin enough to pass light rather than only bounce it, and what
 * comes through carries the emitter's colour and not the leaf's.
 *
 * Kept honest by three things: the pull is toward the emitter hue *at the
 * blade's own luma*, so it recolours and never brightens; it is scaled by the
 * emitters' share of the light on this tile, so daylight alone does nothing
 * and the term is inert on a map with no dynamic light; and it runs to zero
 * at the root, where a blade is thick and sits in its own shadow.
 *
 * `terrainLighting.ts` is still the only writer of how much light is here -
 * this spends `extraLit`, it does not add to it. Dev seam: `?grasstransmit=`.
 */
const GRASS_TRANSMIT = 0.6;

const transmitDev = devQueryNumber('grasstransmit');

/** 0 on Classic, like `lightTintStrength`: that tier gets no modern term. */
function grassTransmitStrength(): number {
  if (transmitDev !== null) return Math.max(0, transmitDev);

  return tierIndex() >= 1 ? GRASS_TRANSMIT : 0;
}

/**
 * What walks through the grass and what flies over it.
 *
 * The cheapest thing that does this job: a short uniform array of the nearest
 * actors, tested in the vertex shader. No second texture, no per-frame
 * upload, no CPU pass over the field - the only cost is `GRASS_ACTORS`
 * distance tests per vertex, on the detailed blade alone.
 *
 * The alternative was a trample map in the `terrainDynamicLight` mould: a
 * texture actors stamp and grass samples. It buys a *trail* - grass that
 * stays flat behind you and springs back - and unlimited actors, for one
 * fetch instead of eight tests. It also costs a texture, a per-frame upload
 * and a decay pass, and it needs a moving window to have the resolution a
 * one-tile-wide character needs. Worth revisiting if the springback is
 * wanted; not the cheapest way to get what was asked for.
 */
const GRASS_ACTORS = 16;

/**
 * Grass does not spring back the instant a foot leaves it, and a press that
 * vanishes on the frame the player steps off pops.
 *
 * So the slots are not actors, they are *presses*: a body stamps one where it
 * stands, keeps it alive while it is there, and every press fades over
 * `PRESS_LIFE` once nothing is refreshing it. A body that moves further than
 * `STAMP_STEP` from the nearest press stamps another, which leaves a short
 * trail behind a run that recovers from the back.
 *
 * This is the trample map's springback for the price already being paid -
 * the same uniform array, the same loop - because the persistence lives in
 * ten CPU-side records rather than in a texture.
 */
const STAMP_STEP = 0.75;
/** Seconds a press takes to recover once nothing stands on it. */
const PRESS_LIFE = 4.5;

/**
 * How many bodies may stamp, out of `GRASS_ACTORS` slots. The rest of the
 * slots are the trail they leave: with the budget equal to the slot count
 * there was no room for one, and a crowd of monsters could take every slot
 * from the player.
 */
const ACTOR_BUDGET = 4;

/**
 * Slots left for the trail once every body has its live press.
 *
 * The first `ACTOR_BUDGET` slots are written fresh each frame at wherever the
 * bodies are; the rest hold the breadcrumbs they have left behind, which is
 * the part that fades.
 */
const TRAIL_SLOTS = GRASS_ACTORS - ACTOR_BUDGET;

/** The `n` entries closest to a point, without sorting or allocating. */
function nearest(
  actors: readonly GrassActor[],
  cx: number,
  cz: number,
  n: number
): GrassActor[] {
  picked.length = 0;

  for (const a of actors) {
    const d = (a.x - cx) ** 2 + (a.z - cz) ** 2;

    let at = picked.length;
    while (at > 0 && picked[at - 1].d > d) at--;

    if (at >= n) continue;

    picked.splice(at, 0, { a, d });
    if (picked.length > n) picked.length = n;
  }

  return picked.map(p => p.a);
}

const picked: { a: GrassActor; d: number }[] = [];
/**
 * Tiles from an actor at which the grass is untouched.
 *
 * A tile is a metre and a body is not: 1.6 cleared a 3-metre bubble around
 * the player, which reads as a force field rather than as feet. This is a
 * footprint plus the swing of a leg, and the falloff below starts at 0.6 of
 * it so the edge is a press rather than a wall.
 */
const ACTOR_RADIUS = 0.9;
/** Where the press begins, as a fraction of the radius. */
const ACTOR_CORE = 0.35;
/** How flat a blade goes directly under someone standing on it. */
const TRAMPLE_FLATTEN = 0.8;
/** How far a blade is shoved aside, as a fraction of its height. */
const TRAMPLE_PUSH = 0.8;
/** A flier's downwash reaches further and presses less. */
const FLIER_RADIUS = 2.0;
const FLIER_PUSH = 0.9;
/** Above this height over the ground an actor is flying, not walking. */
const FLYING_OVER = 0.9;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 0.999 ? 0.999 : v);

/**
 * The live actor slots, `GRASS_ACTORS` x (x, z, reach, press). Module state
 * and reused every frame: the whole point of this approach is that it
 * allocates nothing and uploads nothing per frame beyond 32 floats.
 *
 * A reach of 0 is an empty slot, so a frame that finds nobody - or a material
 * whose array never binds - leaves the field standing.
 */
const actorSlots = new Float32Array(GRASS_ACTORS * 4);

/**
 * The two blades.
 *
 * `simple` is three segments tapering straight to a point, and at rest it is
 * exactly that: a triangle. Cheap, and it is what the lower tiers draw.
 *
 * `detailed` keeps its width most of the way up and tapers late, over six
 * segments, so the vertex shader has something to bend into a curve. The
 * width profile is the half that stops it reading as a cone even before the
 * curve: a blade of grass is a strap that narrows near the tip, not a spike.
 */
const BLADE_ROWS = {
  simple: {
    v: [0, 1 / 3, 2 / 3],
    width: [1.0, 0.78, 0.46],
  },
  detailed: {
    v: [0, 0.2, 0.4, 0.6, 0.78, 0.92],
    width: [1.0, 0.99, 0.94, 0.83, 0.62, 0.33],
  },
} as const;

export type BladeKind = keyof typeof BLADE_ROWS;

function bladeVertexData(kind: BladeKind): VertexData {
  const { v, width } = BLADE_ROWS[kind];

  const positions: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i < v.length; i++) {
    positions.push(-width[i] * 0.5, v[i], 0);
    positions.push(width[i] * 0.5, v[i], 0);
    // u runs -1..1 across the blade; the fragment rounds the normal with it.
    uvs.push(-1, v[i], 1, v[i]);
  }

  positions.push(0, 1, 0);
  uvs.push(0, 1);

  const indices: number[] = [];

  for (let i = 0; i + 1 < v.length; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const last = (v.length - 1) * 2;
  indices.push(last, last + 1, last + 2);

  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;

  return data;
}

function createGrassMaterial(
  scene: Scene,
  cards: GrassCards,
  kind: BladeKind
): ShaderMaterial {
  const detailed = kind === 'detailed';

  const material = new ShaderMaterial(
    'TerrainGrassMaterial',
    scene,
    {
      vertexSource: `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;      // x: -1..1 across the blade, y: v along it
  attribute vec4 iRoot; // xyz root in world, w tile slot + placement hash
  attribute vec4 iTint; // rgb the tile's bake, a blade height

  uniform mat4 viewProjection;
  uniform mat4 view;
  uniform vec3 cameraPosition;
  uniform float time;
  uniform vec2 grassFade; // x start, y end
  const vec2 windDir = vec2(${GROUND_WIND[0].toFixed(3)}, ${GROUND_WIND[1].toFixed(3)});
  uniform float grassSnow; // settled-snow coverage, 0 = none
  uniform float grassBurnOn; // 0 = nothing is burnt anywhere, skip the fetch
  uniform sampler2D grassRamp;
  uniform sampler2D grassBurn; // the world-space scar, one byte a texel
${detailed ? `  uniform vec4 grassActors[${GRASS_ACTORS}];` : ''}

  varying vec2 vWorldXZ;
  varying vec3 vWorldPos;
  varying float vViewZ;
  varying vec3 vBake;
  varying vec3 vAlbedo;
  varying float vV;
  varying float vBurn; // 0 whole, 1 taken by the fire
  varying float vSeed; // the blade hash, so its dissolve is its own
${detailed ? '  varying vec3 vFace;\n  varying vec3 vSide;\n  varying float vU;' : ''}

  void main() {
      float v = position.y;
      int slot = int(iRoot.w);
      float hash = iRoot.w - float(slot);

      // Every per-blade quantity is drawn from the one hash, which is itself
      // a pure function of the tile and the blade's index: the field is
      // identical on every load and on every client, which is what lets a
      // block be dropped and rebuilt without the grass moving.
      float yaw = hash * 6.2831853;
      vec2 side = vec2(cos(yaw), sin(yaw));
      // The blade is a flat strap: its width runs along the side vector, so
      // the way it faces - and the way it bends - is across that.
      vec2 facing = vec2(-side.y, side.x);

      // The one hash, decorrelated. Cheaper than carrying more per-instance
      // floats and just as unstructured at this scale.
      float h2 = fract(hash * 37.13);
      float h3 = fract(hash * 91.71);

      // A blade shrinks to nothing rather than fading: the layer is opaque
      // and an alpha ramp would cost it that.
      float dist = distance(iRoot.xz, cameraPosition.xz);
      float near = 1.0 - smoothstep(grassFade.x, grassFade.y, dist);
      // Snow buries what it settles on, so a blade under full cover keeps
      // only SNOW_BURY of its height.
      float height = iTint.a * near * mix(1.0, ${SNOW_BURY.toFixed(2)}, grassSnow);

      // Fire. Read in the *vertex* stage, and that is not a preference: a
      // blade is one to three pixels wide, so a fragment-stage fetch gets
      // derivatives from neighbours that are not on the same blade, lands on
      // the smallest mip and returns garbage. That is the bug that made every
      // blade tip black when the card ramp was first read per fragment.
      //
      // A texel is a quarter tile and the map covers all 256 of them, so the
      // world position is the UV: texel n spans [n, n+1) quarter-tiles and its
      // centre lands exactly on GL's.
      float burnt = grassBurnOn > 0.0
        ? texture2D(grassBurn, iRoot.xz / 256.0).r
        : 0.0;

      // This blade's own threshold, from the hash it already carries.
      float burnAt = ${BURN_MIN.toFixed(2)} + h3 * h3 * h3 * ${BURN_SPREAD.toFixed(2)};
      // How far past its own threshold the fire has taken this blade, 0..1.
      // The fragment stage eats the blade with it; the geometry stays whole.
      //
      // It used to scale the height instead, and a blade shortening to nothing
      // is invisible: the field just gets a little sparser, which at any
      // distance reads as nothing at all. What a burning thing looks like is
      // an *edge* - a line of ember travelling across it with the material
      // gone behind it - so that is what this is.
      vBurn = clamp((burnt - burnAt) / ${BURN_WITHER.toFixed(2)}, 0.0, 1.0);
      vSeed = hash;
      // How far this one has charred on its way there. A blade blackens before
      // it goes, which is what makes the edge read as fire and not as an
      // eraser passing over the field.
      float charred = smoothstep(0.0, burnAt, burnt);

${
  detailed
    ? `
      // Who is standing in this blade, or flying over it. xy world, z reach,
      // w press: positive treads the blade down, negative is a flier's
      // downwash, which shoves it aside without flattening it. z = 0 is an
      // empty slot, so an unbound array leaves the field at rest.
      vec2 shove = vec2(0.0);
      float trodden = 0.0;

      for (int i = 0; i < ${GRASS_ACTORS}; i++) {
        vec4 a = grassActors[i];
        if (a.z <= 0.0) continue;

        vec2 away = iRoot.xz - a.xy;
        float far = length(away);
        float reach = 1.0 - smoothstep(a.z * ${ACTOR_CORE.toFixed(2)}, a.z, far);
        if (reach <= 0.0) continue;

        shove += (far > 0.0001 ? away / far : vec2(1.0, 0.0)) * reach * abs(a.w);

        // The deepest press over this blade, not the sum of them. A blade
        // already flat cannot be flattened again by a second foot, and summing
        // said it could: along a trail the crumbs are stamped STAMP_STEP
        // apart and their falloffs overlap between the footfalls but not on
        // them, so the *gaps* summed past the clamp while the footfalls
        // themselves sat below it. The trail came out scalloped - flatter
        // between the steps than under them - and, worse, each scallop fell
        // off the clamp at its own moment as the presses recovered, so the
        // trail lifted in chunks rather than rising.
        //
        // Sampled across a real trail: 14 of 38 points pinned at the clamp and
        // 2.68 of total variation along it, against 0.72 taking the max, which
        // decays monotonically and never clamps at all.
        //
        // shove above stays a sum: it is a direction, neighbours pointing
        // opposite ways cancel rather than pile up, and nothing clamps it.
        trodden = max(trodden, reach * max(a.w, 0.0));
      }

      height *= 1.0 - min(trodden, 1.0) * ${TRAMPLE_FLATTEN.toFixed(2)};`
    : ''
}

      // The wave. One phase for the whole field, travelling along the wind,
      // so neighbours crest together and the eye has something to follow.
      // No per-blade term here on purpose - that is what made it jitter.
      float along = dot(iRoot.xz, windDir);
      float wave = sin(time * ${WAVE_RATE.toFixed(2)} - along * ${WAVE_FREQ.toFixed(2)});
      float chop = sin(time * ${CHOP_RATE.toFixed(2)} - along * ${CHOP_FREQ.toFixed(2)} + yaw);

      // Biased so the field leans downwind on the whole and the wave rides on
      // top, rather than swinging symmetrically through upright.
      float gust = ${WIND_BIAS.toFixed(2)}
        + wave * ${WAVE_BEND.toFixed(3)}
        + chop * ${CHOP_BEND.toFixed(3)};

      // Weighted v*v so the root stays planted and the tip does the travelling.
      float bend = gust * v * v * height;

      vec3 world = iRoot.xyz;
      world.xz += side * (position.x * ${BLADE_WIDTH.toFixed(4)} * mix(0.75, 1.3, h3));
      world.y += v * height;
      world.xz += windDir * bend;
${
  detailed
    ? `
      // The arc. A blade at rest is not a spike standing straight up - it
      // leans and curves over, and how far is the single thing that stops a
      // field reading as a bed of nails. v^1.6 rather than v^2 so the curve
      // starts low on the blade instead of only kinking at the tip.
      float arc = mix(${ARC_MIN.toFixed(2)}, ${ARC_MAX.toFixed(2)}, h2);
      float curve = arc * pow(v, 1.6);
      world.xz += facing * (curve * height);
      // What the blade spends going sideways it does not spend going up.
      world.y -= curve * curve * height * ${ARC_DROOP.toFixed(2)};

      // Trodden or blown, the blade bows from the root, so the same v*v the
      // wind uses - the base stays where it grew.
      world.xz += shove * (v * v * height);
      world.y -= min(trodden, 1.0) * v * height * 0.25;`
    : ''
}

      vWorldXZ = world.xz;
      vWorldPos = world;
      vViewZ = (view * vec4(world, 1.0)).z;
      vBake = iTint.rgb;
      vV = v;

      // The blade's colour comes from the map's own grass *card*
      // (terrainGrassCards.ts), not from the ground tile it stands on: the
      // original always kept the plant and the floor as two different
      // textures, and on Devias the floor is ice while the grass is
      // frost-white grass. Reading the floor put green blades on a snowfield.
      //
      // x picks the card (the tile's layer-1 slot), y is the height up the
      // blade, so the authored root-to-tip gradient comes along with it.
      // Vertex stage, and not for cost: a blade is one to three pixels wide,
      // so a 2x2 derivative quad on it straddles the background and the
      // implicit LOD comes back garbage. Here there are no derivatives.
      vec2 rampUV = vec2((float(slot) + 0.5) / ${GRASS_CARD_SLOTS.toFixed(1)}, v);
      vec3 card = texture2D(grassRamp, rampUV).rgb;
      float shade = mix(${ROOT_TINT.toFixed(2)}, ${TIP_TINT.toFixed(2)}, v)
        * (1.0 + (hash - 0.5) * ${TINT_JITTER.toFixed(3)});

      // Snow lies on the blade the way it lies on the ground it grows from,
      // and it lies on the tip more than the root.
      vec3 snowed = mix(
        card,
        vec3(${SNOW_COLOUR[0].toFixed(3)}, ${SNOW_COLOUR[1].toFixed(3)}, ${SNOW_COLOUR[2].toFixed(3)}),
        grassSnow * ${SNOW_ON_GRASS.toFixed(2)} * mix(0.7, 1.0, v));

      // Charred toward the root first: fire takes a blade from the bottom, and
      // the tip is the last of it to go.
      vec3 burnedOut = mix(
        snowed,
        vec3(${CHAR_COLOUR[0].toFixed(3)}, ${CHAR_COLOUR[1].toFixed(3)}, ${CHAR_COLOUR[2].toFixed(3)}),
        charred * ${CHAR_TINT.toFixed(2)} * mix(1.0, 0.65, v));

      vAlbedo = burnedOut * shade;
${
  detailed
    ? `
      // The blade's own facing, tilted by however far it has curved over: a
      // blade bent double presents its face to the sky, an upright one
      // presents it sideways.
      vec3 faceN = normalize(vec3(facing.x, curve * 1.6, facing.y));
      vFace = faceN;
      vSide = vec3(side.x, 0.0, side.y);
      vU = uv.x;`
    : ''
}

      gl_Position = viewProjection * vec4(world, 1.0);
  }
  `,
      fragmentSource: `
  precision highp float;

  varying vec2 vWorldXZ;
  varying vec3 vWorldPos;
  varying float vViewZ;
  varying vec3 vBake;
  varying vec3 vAlbedo;
  varying float vV;
  varying float vBurn;
  varying float vSeed;
${detailed ? '  varying vec3 vFace;\n  varying vec3 vSide;\n  varying float vU;\n  uniform vec3 grassSun;' : ''}
  uniform float grassTransmit;

${terrainLightDeclarationsGlsl(true)}

  void main()
  {
${terrainSkyLightGlsl()}
${terrainGroundLightGlsl({ bake: 'vBake', clouds: true })}

${
  detailed
    ? `
    // Form shading: the blade's two faces, not a second light. Rounded across
    // the width so a flat strip reads as a curved one, then run between
    // 1 -/+ FORM_SHADE - mean 1 over a uniform yaw, so the field's average is
    // untouched and only its variation changes.
    vec3 n = normalize(vFace + vSide * (vU * ${BLADE_ROUND.toFixed(2)}));
    float toSun = 0.5 + 0.5 * dot(n, grassSun);
    vec3 albedo = vAlbedo * mix(${(1 - FORM_SHADE).toFixed(2)}, ${(1 + FORM_SHADE).toFixed(2)}, toSun);`
    : `
    vec3 albedo = vAlbedo;`
}

    vec3 f = albedo * groundLit;
    f = muLightTint(f, groundLit);

    // What passes through the blade rather than bouncing off it (GRASS_TRANSMIT).
    float litLuma = dot(groundLit, ${LUMA_GLSL});
    float dynLuma = dot(extraLit, ${LUMA_GLSL});
    float through = litLuma > 1e-4
      ? clamp(dynLuma / litLuma, 0.0, 1.0) * grassTransmit * vV
      : 0.0;
    f = mix(f, dot(f, ${LUMA_GLSL}) * (extraLit / max(dynLuma, 1e-4)), through);

    f = mix(f, pow(max(f, vec3(0.0)), vec3(2.2)), linearOut);

    // The blade being eaten, from the tip down.
    //
    // A dissolve and not a shrink. The blade's geometry stays whole and the
    // fragment stage takes it away, so what the eye follows is an *edge*
    // travelling down each leaf with a line of ember on it. Scaling the height
    // instead - which is what this did first - is invisible: a field of blades
    // getting shorter is a field getting slightly sparser, and at any distance
    // that reads as nothing happening at all.
    //
    // The wobble is per blade, off the hash, so a patch does not burn as one
    // straight line across.
    if (vBurn > 0.0) {
      float wobble = ${DISSOLVE_WOBBLE.toFixed(3)}
        * sin(vV * ${DISSOLVE_FREQ.toFixed(1)} + vSeed * 40.0);
      float edge = 1.0 - vBurn + wobble;
      float past = vV - edge;

      if (past > 0.0) discard;

      // The ember line just under the cut, and the char just under that. This
      // is the only part of the blade that is brighter than the field, and it
      // is what says fire rather than says missing.
      f = mix(f, vec3(${CHAR_COLOUR[0].toFixed(3)}, ${CHAR_COLOUR[1].toFixed(3)}, ${CHAR_COLOUR[2].toFixed(3)}),
        smoothstep(-${DISSOLVE_CHAR.toFixed(2)}, 0.0, past));
      f = mix(f, vec3(${EMBER_COLOUR[0].toFixed(2)}, ${EMBER_COLOUR[1].toFixed(2)}, ${EMBER_COLOUR[2].toFixed(2)}),
        smoothstep(-${DISSOLVE_RIM.toFixed(3)}, 0.0, past));
    }

    gl_FragColor = vec4(f, 1.0);
  }
  `,
    },
    {
      attributes: ['position', 'iRoot', 'iTint'],
      uniforms: [
        'view',
        'world',
        'viewProjection',
        'cameraPosition',
        'grassFade',
        'grassSnow',
        'grassBurnOn',
        'grassTransmit',
        // Both of these have to be *listed*, not just declared in the GLSL and
        // bound: `setFloatArray4` resolves the name against this list, and a
        // name that is not on it silently writes nowhere.
        ...(detailed ? ['grassSun', 'grassActors'] : []),
        ...TERRAIN_LIGHT_UNIFORMS,
        ...CLOUD_UNIFORMS,
      ],
      // Order as terrainLighting.ts requires: its own, then the cascades.
      samplers: [
        ...terrainLightSamplers(true),
        ...TERRAIN_CSM_SAMPLERS,
        'grassRamp',
        'grassBurn',
      ],
      defines: terrainLightDefines(),
      needAlphaBlending: false,
      needAlphaTesting: false,
    }
  );

  material.fogEnabled = false;
  // A blade is one-sided geometry seen from any angle.
  material.backFaceCulling = false;
  material.transparencyMode = 0;

  material.onBindObservable.add(m => {
    const effect = m.material?.getEffect();

    if (!effect) return;

    bindTerrainLight(effect, scene, true);
    effect.setFloat('grassTransmit', grassTransmitStrength());
    effect.setFloat2('grassFade', FADE_START, FADE_END);
    if (detailed) effect.setFloatArray4('grassActors', actorSlots);
    // Zero on every map without settled snow, and zero with advancedEffects
    // off - the same coverage the ground overlay reads.
    effect.setFloat('grassSnow', GameOptions.advancedEffects ? snowCover() : 0);
    if (detailed) {
      // The key's direction, from the one place that owns it. Toward the
      // surface, so the blade face turned into it is the lit one.
      const d = lookDirector()?.state().key.direction ?? [0, -1, 0];
      effect.setFloat3('grassSun', -d[0], -d[1], -d[2]);
    }
    if (cards.ramp) effect.setTexture('grassRamp', cards.ramp);

    // Always bound, even with nothing burnt: an unbound sampler is a draw
    // error, and a draw error here takes the whole grass layer with it. The
    // texture built from no data is all zero, which is an unburnt map, and
    // `grassBurnOn` is what actually saves the fetch.
    effect.setTexture('grassBurn', grassBurnTexture(scene));
    effect.setFloat('grassBurnOn', grassBurnActive() ? 1 : 0);
  });

  registerTerrainMaterial(material);
  material.freeze();

  return material;
}

/**
 * The one hash. `sin`-based rather than a bit mixer because the same value
 * has to be reproducible in the vertex shader from the fraction stored in
 * `iRoot.w`, and because it only has to look unstructured, not be uniform.
 */
function hash01(x: number, y: number, i: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;

  return s - Math.floor(s);
}

export type GrassSource = {
  readonly layer1: Uint8Array;
  readonly layer2: Uint8Array;
  readonly alpha: Uint8Array;
  /** Terrain flags, for the `NoGround` test the mesh makes. */
  readonly attributes: Uint16Array;
  readonly height: Float32Array;
  readonly light: readonly IVector3Like[];
  /** Which layer-1 slots grow grass here, and the map's authored grass colour. */
  readonly cards: GrassCards;
  /** Which blade this tier draws. */
  readonly blade: BladeKind;
  readonly density: number;
};

/** What the system offers each frame: a body that might be in the grass. */
export type GrassActor = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

type Press = { x: number; z: number; life: number; flying: boolean };

export type GrassField = {
  /** Where the camera is, in tiles; drives residency. */
  setCenter(x: number, z: number): void;
  /**
   * Who is in the field this frame. The nearest `GRASS_ACTORS` to the centre
   * win the slots; everyone else is ignored, which is the whole budget.
   */
  setActors(actors: readonly GrassActor[], dt: number): void;
  /** One block of work, at most. Called once per frame. */
  step(): void;
  dispose(): void;
};

export function createGrassField(
  scene: Scene,
  src: GrassSource
): GrassField | null {
  const perTile = BLADES_PER_TILE[Math.min(src.density, 9)] ?? 0;

  // No card, no grass, and no material either: the Dungeon and Tarkan ship
  // none at all, and the original draws nothing there (terrainGrassCards.ts).
  if (perTile <= 0 || !src.cards.slots.size || !src.cards.ramp) return null;

  const material = createGrassMaterial(scene, src.cards, src.blade);
  const blade = bladeVertexData(src.blade);

  const blocks = new Map<number, Mesh | null>();

  let centerX = 0;
  let centerZ = 0;

  /** Live presses, oldest-faintest first out. Never reallocated per frame. */
  const presses: Press[] = [];


  /**
   * How much of this tile is drawn as grass, and which slot the blades take
   * their colour from.
   *
   * The two have to be decided together. Picking the weight from either
   * layer and the slot from the layer the *mesh* happens to draw as its base
   * gives a tile whose grass is painted over sand a blade tinted sand - the
   * blade is standing there precisely because of the other layer. So the
   * slot is whichever grass layer put most of the weight there.
   */
  function grassAt(
    x: number,
    y: number,
    out: { weight: number; slot: number }
  ): void {
    out.weight = 0;
    out.slot = 0;

    // Before any of the original's rules: is there ground here at all?
    //
    // `CreateGroundFromHeightMap` drops a `NoGround` tile's four corners to
    // -10000, which takes the quad out of sight; the height *array* it reads
    // is untouched. Sampling that array, as `heightAt` does, put blades at
    // the nominal height of tiles whose ground had been taken away - grass
    // hanging in the air over Devias' precipices. Same flag, same index, same
    // answer as the mesh (customGroundMesh.ts:96).
    if (isFlagInBinaryMask(src.attributes[TERRAIN_INDEX(x, y)], TWFlags.NoGround)) {
      return;
    }

    // The original's rule, in its own order (ZzzLodTerrain.cpp:1611-1625).
    //
    // 1. Any alpha painted on any of the four corners and the tile is skipped
    //    outright - grass grows only on a tile that is one layer all the way
    //    through, so a blend is where it stops. Not a fade: a hard edge, and
    //    that is what the original looks like.
    const i = TERRAIN_INDEX(x, y);

    if (
      src.alpha[i] > 0 ||
      src.alpha[TERRAIN_INDEX(x + 1, y)] > 0 ||
      src.alpha[TERRAIN_INDEX(x, y + 1)] > 0 ||
      src.alpha[TERRAIN_INDEX(x + 1, y + 1)] > 0
    ) {
      return;
    }

    // 2. Layer 1 - never layer 2 - indexes the card set, and the card has to
    //    exist. `cards.slots` is that `FindTexture` null check.
    const slot = src.layer1[i];

    if (!src.cards.slots.has(slot)) return;

    out.weight = 1;
    out.slot = slot;
  }

  function heightAt(fx: number, fz: number): number {
    const xi = Math.floor(fx);
    const zi = Math.floor(fz);
    const dx = fx - xi;
    const dz = fz - zi;

    const h1 = src.height[TERRAIN_INDEX(xi, zi)];
    const h2 = src.height[TERRAIN_INDEX(xi + 1, zi)];
    const h3 = src.height[TERRAIN_INDEX(xi, zi + 1)];
    const h4 = src.height[TERRAIN_INDEX(xi + 1, zi + 1)];

    return (
      h1 * (1 - dx) * (1 - dz) +
      h2 * dx * (1 - dz) +
      h3 * (1 - dx) * dz +
      h4 * dx * dz
    );
  }

  /**
   * The blade's bake, from the same array the ground mesh's own vertex
   * colours come from (`unpackTerrainLight`) - one source, sampled twice,
   * rather than a second opinion about what the bake says.
   */
  function bakeAt(x: number, y: number, out: [number, number, number]): void {
    const c = src.light[TERRAIN_INDEX(x, y)];

    out[0] = c.x;
    out[1] = c.y;
    out[2] = c.z;
  }

  function buildBlock(key: number): void {
    const bx = (key % BLOCKS_PER_SIDE) * BLOCK_TILES;
    const bz = Math.floor(key / BLOCKS_PER_SIDE) * BLOCK_TILES;

    const roots: number[] = [];
    const tints: number[] = [];
    const bake: [number, number, number] = [0, 0, 0];
    const tile = { weight: 0, slot: 0 };

    let minY = Infinity;
    let maxY = -Infinity;

    for (let z = bz; z < bz + BLOCK_TILES; z++) {
      for (let x = bx; x < bx + BLOCK_TILES; x++) {
        // The last row and column have no far corner to interpolate to.
        if (x >= TERRAIN_SIZE - 1 || z >= TERRAIN_SIZE - 1) continue;

        grassAt(x, z, tile);

        if (tile.weight <= 0) continue;

        const slot = tile.slot;
        const count = Math.round(tile.weight * perTile);

        bakeAt(x, z, bake);

        for (let b = 0; b < count; b++) {
          const hx = hash01(x, z, b * 3);
          const hz = hash01(x, z, b * 3 + 1);
          const hh = hash01(x, z, b * 3 + 2);

          // Grass grows in tufts, not on a Poisson disc. Each blade joins one
          // of a few clumps in the tile and jitters around its centre, which
          // is most of the difference between a field and a lawn.
          const clump = b % CLUMPS_PER_TILE;
          const cx = hash01(x, z, 901 + clump * 2);
          const cz = hash01(x, z, 902 + clump * 2);

          const fx = x + clamp01(cx + (hx - 0.5) * CLUMP_SPREAD);
          const fz = z + clamp01(cz + (hz - 0.5) * CLUMP_SPREAD);
          const y = heightAt(fx, fz);
          const height = BLADE_MIN_H + hh * (BLADE_MAX_H - BLADE_MIN_H);

          // The slot rides in the integer part and the hash in the fraction:
          // one attribute carries which tile texture tints the blade and
          // every per-blade random the vertex shader needs.
          roots.push(fx, y, fz, slot + Math.min(hh, 0.999999));
          tints.push(bake[0], bake[1], bake[2], height);

          if (y < minY) minY = y;
          if (y + height > maxY) maxY = y + height;
        }
      }
    }

    if (!roots.length) {
      // Nothing grows here. Recorded so residency does not retry it every
      // frame for as long as the player stands nearby.
      blocks.set(key, null);
      return;
    }

    const mesh = new Mesh(`_grass_${key}`, scene);
    blade.applyToMesh(mesh, false);

    mesh.material = material;
    mesh.isPickable = false;
    mesh.doNotSyncBoundingInfo = true;
    mesh.alwaysSelectAsActiveMesh = false;

    mesh.thinInstanceSetBuffer('iRoot', new Float32Array(roots), 4, true);
    mesh.thinInstanceSetBuffer('iTint', new Float32Array(tints), 4, true);

    // `forcedInstanceCount`, not `thinInstanceCount`: the latter's setter
    // sizes itself against the *matrix* buffer and silently ignores any
    // count when there is none (thinInstanceMesh.js:75-81), and this layer
    // carries no matrices - a 4x4 per blade would be 64 bytes to hold a yaw
    // the vertex shader rebuilds from `iRoot.w` in two instructions. Both
    // satisfy `hasThinInstances` and both drive the instanced draw
    // (mesh.js:205, :1542).
    mesh.forcedInstanceCount = roots.length / 4;

    // Set by hand: `thinInstanceRefreshBoundingInfo` derives bounds from a
    // matrix buffer this layer deliberately does not carry, and the block
    // already knows its own footprint. The bend can push a tip a blade's
    // height past the tile edge, hence the margin.
    mesh.setBoundingInfo(
      new BoundingInfo(
        new Vector3(bx - BLADE_MAX_H, minY, bz - BLADE_MAX_H),
        new Vector3(
          bx + BLOCK_TILES + BLADE_MAX_H,
          maxY,
          bz + BLOCK_TILES + BLADE_MAX_H
        )
      )
    );

    blocks.set(key, mesh);
  }

  /** Nearest point of a block to the camera, in tiles. */
  function blockDistance(key: number): number {
    const bx = (key % BLOCKS_PER_SIDE) * BLOCK_TILES;
    const bz = Math.floor(key / BLOCKS_PER_SIDE) * BLOCK_TILES;

    const dx = Math.max(bx - centerX, 0, centerX - (bx + BLOCK_TILES));
    const dz = Math.max(bz - centerZ, 0, centerZ - (bz + BLOCK_TILES));

    return Math.hypot(dx, dz);
  }

  function dropBlock(key: number): void {
    blocks.get(key)?.dispose();
    blocks.delete(key);
  }

  // What the fire is allowed to take, and how high off the ground its embers
  // sit. Handed over rather than imported back: `grassBurn.ts` is a leaf, and
  // the weather module cycle that `snowMelt.ts:33-43` documents is not one to
  // walk into a second time. Fire therefore crosses a field and stops at the
  // flagstones, on the original's own rule for where grass grows, for free.
  const fuel = { weight: 0, slot: 0 };

  setGrassProbe((x, z) => {
    grassAt(Math.floor(x), Math.floor(z), fuel);
    return fuel.weight > 0;
  });
  setGroundProbe(heightAt);

  return {
    setCenter(x, z) {
      centerX = x;
      centerZ = z;
    },

    setActors(actors, dt) {
      if (src.blade !== 'detailed') return;

      // Everything fades first, so a press nothing refreshes this frame is
      // already on its way back up.
      for (let i = presses.length - 1; i >= 0; i--) {
        presses[i].life -= dt / PRESS_LIFE;
        if (presses[i].life <= 0) presses.splice(i, 1);
      }

      // Nearest to the centre first, and only that many stamp anything.
      //
      // Without this the slots went first-come: the hero, who is what the
      // camera is looking at, lost all ten of them to whichever monsters the
      // query happened to yield first, and the grass pressed itself down
      // around bodies fifteen tiles away while the player walked through an
      // untouched field. The budget is deliberately below the slot count so
      // there is room left for the trail these actors leave behind them.
      const near = nearest(actors, centerX, centerZ, ACTOR_BUDGET);

      actorSlots.fill(0);

      let slot = 0;

      function write(
        x: number,
        z: number,
        flying: boolean,
        strength: number
      ): void {
        const i = slot++ * 4;

        actorSlots[i] = x;
        actorSlots[i + 1] = z;
        actorSlots[i + 2] = flying ? FLIER_RADIUS : ACTOR_RADIUS;
        actorSlots[i + 3] = (flying ? -FLIER_PUSH : TRAMPLE_PUSH) * strength;
      }

      for (const a of near) {
        // Flying is measured against the ground the blade grows from, not
        // read off a state flag: anything far enough above it is overhead.
        const flying = a.y - heightAt(a.x, a.z) > FLYING_OVER;

        // The live press, written where the body is this frame.
        //
        // Without it the only thing bending the grass was the trail, and a
        // breadcrumb is only laid every `STAMP_STEP`. So the press under a
        // running player did not follow them, it jumped three quarters of a
        // tile at a time and sat still in between: the grass reacted in steps
        // instead of moving, which is what reads as a slow, stuttering
        // animation. This one tracks the body exactly, every frame.
        write(a.x, a.z, flying, 1);

        // And the trail it leaves. A breadcrumb is stamped once the body is
        // clear of the last one, and then stays where it was put - dragging it
        // along with the body was the reason no trail ever formed. It starts
        // recovering the moment the body walks on.
        let nearestD = STAMP_STEP * STAMP_STEP;
        let found = false;

        for (const p of presses) {
          if (p.flying !== flying) continue;

          const d = (p.x - a.x) ** 2 + (p.z - a.z) ** 2;

          if (d < nearestD) {
            nearestD = d;
            found = true;
          }
        }

        if (found) continue;

        // Full: drop the faintest, and among equally faint ones the furthest
        // away - so a fresh press near the camera never loses to a stale one
        // at the edge of the field.
        if (presses.length >= TRAIL_SLOTS) {
          let worst = 0;

          for (let i = 1; i < presses.length; i++) {
            const p = presses[i];
            const q = presses[worst];

            if (p.life < q.life - 0.01) {
              worst = i;
            } else if (p.life < q.life + 0.01) {
              const dp = (p.x - centerX) ** 2 + (p.z - centerZ) ** 2;
              const dq = (q.x - centerX) ** 2 + (q.z - centerZ) ** 2;
              if (dp > dq) worst = i;
            }
          }

          presses.splice(worst, 1);
        }

        presses.push({ x: a.x, z: a.z, life: 1, flying });
      }

      for (const p of presses) {
        if (slot >= GRASS_ACTORS) break;

        // Smootherstep, not smoothstep: zero first *and* second derivative at
        // both ends, so the blade neither jumps as it starts lifting nor
        // arrives at upright with any velocity left. Over `PRESS_LIFE` that
        // is a press which holds, then rises, then settles.
        const t = p.life;

        write(p.x, p.z, p.flying, t * t * t * (t * (t * 6 - 15) + 10));
      }
    },

    step() {
      for (const key of blocks.keys()) {
        if (blockDistance(key) > RESIDENT_RANGE) dropBlock(key);
      }

      // One build per frame. A whole ring at once is ~25 blocks of work on
      // the frame the player warps in, which is the one frame that can least
      // afford it.
      let nearest = -1;
      let nearestDistance = Infinity;

      const minBx = Math.max(
        Math.floor((centerX - RESIDENT_RANGE) / BLOCK_TILES),
        0
      );
      const maxBx = Math.min(
        Math.floor((centerX + RESIDENT_RANGE) / BLOCK_TILES),
        BLOCKS_PER_SIDE - 1
      );
      const minBz = Math.max(
        Math.floor((centerZ - RESIDENT_RANGE) / BLOCK_TILES),
        0
      );
      const maxBz = Math.min(
        Math.floor((centerZ + RESIDENT_RANGE) / BLOCK_TILES),
        BLOCKS_PER_SIDE - 1
      );

      for (let bz = minBz; bz <= maxBz; bz++) {
        for (let bx = minBx; bx <= maxBx; bx++) {
          const key = bz * BLOCKS_PER_SIDE + bx;

          if (blocks.has(key)) continue;

          const d = blockDistance(key);

          if (d > RESIDENT_RANGE || d >= nearestDistance) continue;

          nearest = key;
          nearestDistance = d;
        }
      }

      if (nearest < 0) return;

      try {
        buildBlock(nearest);
      } catch (error) {
        // One block's failure is one block of missing grass, not a map
        // without ground.
        console.warn('Grass block failed to build:', error);
        blocks.set(nearest, null);
      }
    },

    dispose() {
      for (const mesh of blocks.values()) mesh?.dispose();
      blocks.clear();
      material.dispose();
    },
  };
}


/**
 * Where the original turned the pass off outright: Chaos Castle and Blood
 * Castle (`TerrainGrassEnable = false`, ZzzLodTerrain.cpp:326-329), Atlans and
 * Doppelganger 3 (the `RenderTerrain` guard, :2651).
 *
 * Everywhere else needs no list: a map with no grass in its splat grows no
 * blades, which is already the right answer for every interior and tower.
 * Atlans is the instructive one - it is underwater, and its grass slots
 * carry seabed textures, so without this it would sprout a lawn on the
 * ocean floor.
 */
function grassAllowed(map: ENUM_WORLD): boolean {
  if (map >= ENUM_WORLD.WD_11BLOODCASTLE1 && map <= ENUM_WORLD.WD_18CHAOS_CASTLE_END) {
    return false;
  }

  return (
    map !== ENUM_WORLD.WD_7ATLANSE &&
    map !== ENUM_WORLD.WD_52BLOODCASTLE_MASTER_LEVEL &&
    map !== ENUM_WORLD.WD_53CAOSCASTLE_MASTER_LEVEL &&
    map !== ENUM_WORLD.WD_67DOPPLEGANGER3
  );
}

/**
 * The option, with Classic forced to nothing.
 *
 * Classic is the reference client's frame, and while the original did have a
 * grass pass it drew flat cards, not these blades - so leaving them on would
 * put a look in the tier that exists to be compared against the original.
 * The tier is the gate; the slider is the taste.
 */
function grassDensity(): number {
  return GameOptions.grassDensity;
}

/**
 * Which blade the tier draws.
 *
 * The original had a grass pass, so Classic having grass is closer to the
 * reference than having none - it just gets the cheap blade. Ultra gets the
 * curved one. The slider is how much; the tier is how good.
 */
function bladeKind(): BladeKind {
  return tierIndex() >= 2 ? 'detailed' : 'simple';
}

/**
 * The live field and what it was built from. Module state rather than a slot
 * on `World.terrain` because the density option can change between map loads
 * and the field then has to be rebuilt from the same source - which the ECS
 * system has no business holding.
 */
type Installed = {
  readonly scene: Scene;
  readonly src: Omit<GrassSource, 'density' | 'blade'>;
  field: GrassField | null;
  density: number;
  blade: BladeKind;
};

let installed: Installed | null = null;

function build(entry: Installed): void {
  entry.field = createGrassField(entry.scene, {
    ...entry.src,
    density: entry.density,
    blade: entry.blade,
  });
}

/** Built at map load by `getTerrainData`; replaces whatever stood before. */
export function installGrassField(
  scene: Scene,
  map: ENUM_WORLD,
  src: Omit<GrassSource, 'density' | 'blade'>
): void {
  disposeGrassField();

  if (!grassAllowed(map)) return;

  installed = {
    scene,
    src,
    field: null,
    density: grassDensity(),
    blade: bladeKind(),
  };

  build(installed);
}

export function disposeGrassField(): void {
  installed?.field?.dispose();
  installed = null;
}

/**
 * The field for this frame, rebuilt first if the density option or the tier
 * moved - the tier picks the blade, so changing it changes the geometry and
 * the shader both. The rebuild is a dispose and a re-create: blocks stream
 * back in one per frame from wherever the camera is, so the cost is spread
 * the same way a warp's is.
 */
export function grassFieldForFrame(): GrassField | null {
  if (!installed) return null;

  const density = grassDensity();
  const blade = bladeKind();

  if (installed.density !== density || installed.blade !== blade) {
    installed.field?.dispose();
    installed.density = density;
    installed.blade = blade;
    build(installed);
  }

  return installed.field;
}
