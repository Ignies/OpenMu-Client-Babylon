import type { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';
import { GameOptions } from '../common/gameOptions';
import { isTileOpen } from '../libs/mu/terrainMask';
import type { TerrainLayers, World } from '../ecs/world';
import { SNOW_COVER, overlayBedShare } from '../libs/mu/terrainOverlay';
import { SNOW_GROUND_MAPS, snowCover } from './snowCover';
import { snowMeltAt } from './snowMelt';
import { FOOTPRINT_TUNING } from './footprints';

/**
 * How far something standing in settled snow sinks into it.
 *
 * A character whose boots rest on the surface beside a hole their own stride
 * just punched is visibly floating — which is exactly what the trail makes
 * obvious, because the print is the evidence that the leg went down. So the
 * depth here is a fraction of the print's own depth (`FOOTPRINT_TUNING.sink`)
 * rather than a number of its own: dial the hollow deeper through
 * `muFootprints` and the wearer goes down with it.
 *
 * Applied to the RENDERED position only, in `renderSystem`, next to the
 * dying-sink that already lowers a corpse. The logical `transform.pos` is
 * untouched: it is what pathing, targeting and the server agree on, and a
 * visual detail has no business moving it.
 *
 * ### It has to be local, and the first cut was not
 *
 * A single map-wide depth sank characters through paving, through the boards
 * of a bridge and through the floor of every interior — anywhere the snow was
 * not actually lying but the map still said "Devias". Four things decide it
 * now, and all four already existed for other reasons:
 *
 *  - **Standing on something.** A bridge, a dock, a floor: these are map
 *    objects sitting above the terrain, and the terrain's snow is not what the
 *    boots are on. Detected by comparing the entity's own y against the ground
 *    under it, which needs no new data and covers every such object at once.
 *  - **A roof overhead.** `isTileOpen` is the mask the ground overlays already
 *    use to keep snow out of interiors; a room whose floor has no snow drawn
 *    on it must not swallow anyone standing in it either.
 *  - **What the tile is.** Devias' own tiles say where snow lies. The first
 *    cut reused the original's *sound* test (`tile !== 3 && tile < 10`, the
 *    `sound/footsteps` rule) and that was wrong for a print: the original plays
 *    the snow footstep on the paving slabs of the square as readily as on a
 *    drift, so heroes crossing swept stone left snow holes in it. What a
 *    print needs is whether the ground is *drawn* as snow, and that is the
 *    overlay's own business: `SNOW_COVER.bed` in terrainOverlay.ts says how
 *    much snow each Devias tile texture holds, the terrain shader thins the
 *    drawn layer by it, and this file reads the same table through the same
 *    layer-1/layer-2 alpha mix. Paving gets a wash under the print
 *    threshold; drifts get everything.
 *  - **How much snow has fallen.** The weather accumulator, as before.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Cover below which nothing sinks, and cover at which the snow is as deep as
 * it gets. The lower bound matches the footprint system's own threshold, for
 * the same reason: a dusting is not something you stand *in*.
 */
const SINK_MIN = 0.12;
const SINK_FULL = 0.55;


/**
 * Height above the ground past which an entity is taken to be standing on
 * something rather than in the snow.
 *
 * Generous enough to survive the small disagreements between a model's origin
 * and the interpolated terrain height under it, tight enough that the lowest
 * boardwalk still counts as a floor.
 */
const ON_OBJECT = 0.35;

// ---- 2. state + readers ----------------------------------------------------

/** Scratch for the tile lookup; the sink allocates nothing per call. */
const layers: TerrainLayers = { layer1: 0, layer2: 255, alpha: 0 };

/**
 * How snowy this tile is *drawn*, 0…1: the overlay's own bed table
 * (`SNOW_COVER.bed`), mixed across the two mapping layers by the same alpha
 * the terrain shader mixes them with. One table, read by the shader for the
 * snow you see and here for the snow you stand in, so the two cannot
 * disagree.
 */
function snowTileShare(world: World, x: number, z: number): number {
  world.getTerrainLayers(~~x, ~~z, layers);

  const under = overlayBedShare(SNOW_COVER, layers.layer1);
  if (layers.alpha <= 0) return under;

  const over = overlayBedShare(SNOW_COVER, layers.layer2);
  return under + (over - under) * layers.alpha;
}

/**
 * How snowy the ground is under a point, 0…1.
 *
 * Bilinear across the four tiles around it rather than a straight lookup, so
 * walking off a path onto open ground ramps over a tile instead of the
 * character dropping a step the instant a tile boundary is crossed.
 *
 * Also what the footprint system asks before laying a print. It used to test
 * only `isTileOpen`, which says whether there is sky overhead and nothing
 * about what is underfoot - so a hero crossing Devias' paved square stamped
 * snow prints into swept stone. One field answering for the sink and the
 * prints together is also the only way they can agree.
 */
export function snowUnderfoot(world: World, x: number, z: number): number {
  const fx = x - 0.5;
  const fz = z - 0.5;
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const tx = fx - x0;
  const tz = fz - z0;

  let acc = 0;

  for (let i = 0; i < 4; i++) {
    const cx = x0 + (i & 1);
    const cz = z0 + (i >> 1);

    const open = isTileOpen(cx + 0.5, cz + 0.5);
    const share = open ? snowTileShare(world, cx, cz) : 0;

    const w = ((i & 1) === 0 ? 1 - tx : tx) * ((i >> 1) === 0 ? 1 - tz : tz);
    acc += share * w;
  }

  // What fire has taken off the ground (weather/snowMelt.ts), with the
  // shader's own falloff — so a hero standing in a patch a fireball opened
  // neither sinks into snow that is no longer drawn there nor stamps a print
  // into it. Applied to the finished share rather than per corner: a melt is
  // a smooth field of its own and owes nothing to the tile grid.
  const melt = snowMeltAt(x, z);

  return melt > 0 ? acc * (1 - melt) : acc;
}

/**
 * Whether something at (x, y, z) is standing on the terrain rather than on
 * top of something built on it.
 *
 * A bridge, a dock, an interior floor: these are map objects sitting above the
 * terrain, and the terrain's snow is not what the boots are on. Detected by
 * comparing the entity's own y against the ground under it, which needs no new
 * data and covers every such object at once.
 *
 * Shared with the footprint system, which needs exactly the same answer for
 * exactly the same reason: a print is the evidence that a foot went into the
 * snow, and a boot standing on a bridge deck did not. It used to test only
 * `isTileOpen` — sky overhead — so the hero crossing Devias' bridges stamped
 * holes into the planks. The sink already refused to lower them there, which
 * is how the disagreement showed: the character stood proud of the deck beside
 * a hole in it.
 */
export function onSnowGround(
  world: World,
  x: number,
  y: number,
  z: number
): boolean {
  const ground = world.getTerrainHeight(x, z);

  // -9999 until the height data lands, and a NoGround tile is -10000. Neither
  // is a floor anybody is standing on.
  if (ground <= -9000) return false;

  return y - ground <= ON_OBJECT;
}

/**
 * How far into the ground a model at this position should be drawn, in tiles.
 *
 * Zero unless the weather layers are on, there is enough settled snow to
 * stand in (`snowCover()` is 0 off `SNOW_GROUND_MAPS`), and the thing is
 * actually standing on the ground.
 */
export function snowSinkDepth(
  world: World,
  map: ENUM_WORLD,
  x: number,
  y: number,
  z: number
): number {
  if (!GameOptions.weatherEffects || !GameOptions.advancedEffects) return 0;

  const cover = snowCover();
  if (cover <= SINK_MIN) return 0;

  // On a bridge, a dock, an interior floor: the terrain's snow is under the
  // structure, not under the boots.
  if (!onSnowGround(world, x, y, z)) return 0;

  const here = snowUnderfoot(world, x, z);
  if (here <= 0) return 0;

  const t = Math.min(1, (cover - SINK_MIN) / (SINK_FULL - SINK_MIN));

  return FOOTPRINT_TUNING.depth * FOOTPRINT_TUNING.sink * t * here;
}

// ---- 3. the layer ----------------------------------------------------------

/**
 * Nothing to advance or reset: the cover it reads is owned by
 * `snowCoverLayer`, the tile table by the overlay. Listed so
 * `weather.layersFor(map)` and the tooling know the effect exists.
 */
export const snowSinkLayer: WeatherLayer = {
  name: 'snowSink',
  maps: SNOW_GROUND_MAPS,
};
