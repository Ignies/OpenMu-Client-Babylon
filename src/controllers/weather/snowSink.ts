import type { ENUM_WORLD } from '../../core/types';
import type { WeatherLayer } from './layer';
import { GameOptions } from '../../features/options/gameOptions';
import { isTileOpen } from '../terrain/terrainMask';
import type { TerrainLayers, World } from '../../ecs/world';
import { overlayBedShare, snowCoverFor } from '../terrain/terrainOverlay';
import { SNOW_GROUND_MAPS, snowCover } from './snowCover';
import { snowMeltAt } from './snowMelt';
import { FOOTPRINT_TUNING } from './footprints';

/**
 * How far a character standing in settled snow sinks: a share of the print depth
 * (`FOOTPRINT_TUNING.sink`), applied to the rendered position only, per tile. See readme.md.
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
  const snow = snowCoverFor(world.mapIndex);

  const under = overlayBedShare(snow, layers.layer1);
  if (layers.alpha <= 0) return under;

  const over = overlayBedShare(snow, layers.layer2);
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

  // What fire has taken off the ground (controllers/weather/snowMelt.ts), with the
  // shader's own falloff - so a hero standing in a patch a fireball opened
  // neither sinks into snow that is no longer drawn there nor stamps a print
  // into it. Applied to the finished share rather than per corner: a melt is
  // a smooth field of its own and owes nothing to the tile grid.
  const melt = snowMeltAt(x, z);

  return melt > 0 ? acc * (1 - melt) : acc;
}

/**
 * Whether something at (x, y, z) stands on the terrain, not on a bridge, dock or floor above it
 * (its y against the ground). Shared with the footprint system so prints and the sink agree.
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
