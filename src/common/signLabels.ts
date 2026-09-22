import { ENUM_WORLD } from './types';
import { t } from '../i18n';
import type { TextKey } from '../i18n/recipes';

/**
 * What every signpost in the game says.
 *
 * The originals are blank in the only sense that matters: the lettering on
 * them is decorative nonsense painted at 64x64 (`signPlates.ts`), the same
 * three plates repeated across four maps, so a post on the Noria road and a
 * board over a shop door read identically. This table gives each placement a
 * name and `signObject.ts` paints it on.
 *
 * Two kinds of name:
 *
 *  - **A destination.** A post standing on a road says where the road goes:
 *    the map's own name, or the neighbouring map when the post is near the
 *    gate that leads there. "Near" is within 35 tiles of the gate *and*
 *    closer to it than to the town — without the second half every sign in
 *    Devias would point at Lorencia, whose gate sits 30 tiles off the market
 *    square.
 *  - **A building.** The bracket boards (Lorencia's `Sign01`, Devias' type
 *    35) hang off a wall rather than stand on a road, so they name the
 *    building they hang on rather than a place.
 *
 * Rows are `[type, tileX, tileY, key]` with the tiles rounded: a placement in
 * `EncTerrain<n>.obj` is a float that never moves, so the rounded tile is a
 * stable key and a readable one. A placement with no row keeps the texture
 * the GLB shipped with rather than being guessed at.
 *
 * Only the models with a whole title band on them are listed. Devias 42 and
 * 67, and both Santa Town boards (63/23 and 63/24), carry a plate texture but
 * their planks are mapped across a *corner* of the band — 42 takes its top
 * six rows, 67 a 14x4 patch of one — so a name centred in the band would be
 * sliced in half on them. They keep the texture they shipped with, which is
 * why Santa Town has no rows at all.
 *
 * Sources: `Data/World<n>/EncTerrain<n>.obj` for the placements, `gate.bmd`
 * for the map gates, and `Local/<lang>/Minimap/Minimap_World<n>_<lang>.bmd`
 * for the NPC each bracket board hangs beside.
 */

/** The label keys, as `sign.<key>` in the text catalogue. */
type LabelKey =
  // where a road goes
  | 'lorencia'
  | 'devias'
  | 'noria'
  | 'elbeland'
  | 'raklion'
  | 'valleyOfLoren'
  | 'stadium'
  // what a building is
  | 'pub'
  | 'shop'
  | 'guardhouse'
  | 'church'
  | 'guild';

type Row = readonly [type: number, x: number, y: number, key: LabelKey];

const SIGNS: Partial<Record<ENUM_WORLD, readonly Row[]>> = {
  // ---- Lorencia (World1) --------------------------------------------------
  // Four gates leave the map — Dungeon south (122, 232), Devias north-west
  // (5, 39), Noria south-east (215, 246), Valley of Loren north-east
  // (239, 14) — and only the last two have a post anywhere near them. The
  // west-road post is the exception in the table: it is 118 tiles from the
  // Devias gate, but it is the only post on the road that leads there.
  [ENUM_WORLD.WD_0LORENCIA]: [
    // type 96 — Object97
    [96, 116, 114, 'shop'], // the north-west corner of the square, at Pasi the Mage
    [96, 129, 122, 'pub'], // the north-east corner of the pub floor (create.ts PUB, x 121-129 y 121-137)
    [96, 141, 145, 'shop'], // the south-east building inside the square
    // type 97 — Object98
    [97, 68, 141, 'devias'], // the west road out of town; the Devias gate is its far end
    [97, 128, 87, 'lorencia'],
    [97, 176, 130, 'lorencia'],
    [97, 219, 14, 'valleyOfLoren'], // 20 tiles from the valleyOfLoren gate
    [97, 213, 241, 'noria'], // 6 tiles from the noria gate
  ],

  // ---- Devias (World3) ----------------------------------------------------
  // Types 58 and 59 are the two halves of the two-plank road sign — 58 takes
  // the upper board, 59 the lower — and there are 52 of them marking the path
  // network across the whole map. 27 is the standing plaque, 35 the bracket
  // board on a wall.
  [ENUM_WORLD.WD_2DEVIAS]: [
    // type 27 — Object28
    [27, 48, 24, 'devias'],
    [27, 220, 79, 'devias'],
    [27, 221, 205, 'devias'],
    // type 35 — Object36
    [35, 30, 29, 'shop'], // the north-west fort, at Natasha the Firecracker Merchant
    [35, 186, 43, 'guardhouse'], // DEVIAS_GUARD_ROOM (186,43)-(194,51)
    [35, 202, 55, 'guild'], // DEVIAS_WEST_HEARTH_HOUSE, where Mercenary Guild Manager Tercia stands
    [35, 216, 28, 'church'], // the church, DEVIAS_READING_ROOM (204,12)-(216,32)
    [35, 229, 20, 'pub'], // DEVIAS_TAVERN (225,20)-(237,28), Caren the Barmaid inside
    [35, 225, 37, 'shop'], // DEVIAS_EAST_HEARTH_HOUSE, where Wizard Izabel stands
    // type 58 — Object59
    [58, 24, 91, 'raklion'], // 29 tiles from the raklion gate
    [58, 21, 142, 'devias'],
    [58, 60, 28, 'devias'],
    [58, 55, 61, 'raklion'], // 31 tiles from the raklion gate
    [58, 78, 75, 'raklion'], // 30 tiles from the raklion gate
    [58, 85, 26, 'devias'],
    [58, 106, 28, 'devias'],
    [58, 99, 77, 'devias'],
    [58, 120, 165, 'devias'],
    [58, 117, 203, 'devias'],
    [58, 128, 34, 'devias'],
    [58, 131, 217, 'devias'],
    [58, 150, 30, 'devias'],
    [58, 144, 124, 'devias'],
    [58, 151, 220, 'elbeland'], // 27 tiles from the elbeland gate
    [58, 158, 239, 'elbeland'], // 8 tiles from the elbeland gate
    [58, 174, 74, 'devias'],
    [58, 182, 110, 'devias'],
    [58, 188, 226, 'elbeland'], // 31 tiles from the elbeland gate
    [58, 202, 125, 'devias'],
    [58, 202, 143, 'devias'],
    [58, 195, 157, 'devias'],
    [58, 215, 37, 'devias'],
    [58, 216, 86, 'devias'],
    [58, 214, 94, 'devias'],
    [58, 213, 110, 'devias'],
    [58, 220, 200, 'devias'],
    [58, 238, 39, 'lorencia'], // 7 tiles from the lorencia gate
    [58, 240, 95, 'devias'],
    // type 59 — Object60
    [59, 24, 91, 'raklion'], // 29 tiles from the raklion gate
    [59, 22, 141, 'devias'],
    [59, 60, 29, 'devias'],
    [59, 55, 61, 'raklion'], // 31 tiles from the raklion gate
    [59, 55, 61, 'raklion'], // 31 tiles from the raklion gate
    [59, 76, 74, 'raklion'], // 29 tiles from the raklion gate
    [59, 84, 26, 'devias'],
    [59, 105, 29, 'devias'],
    [59, 99, 77, 'devias'],
    [59, 127, 34, 'devias'],
    [59, 119, 165, 'devias'],
    [59, 116, 203, 'devias'],
    [59, 130, 216, 'devias'],
    [59, 149, 30, 'devias'],
    [59, 145, 122, 'devias'],
    [59, 150, 219, 'elbeland'], // 29 tiles from the elbeland gate
    [59, 173, 73, 'devias'],
    [59, 180, 45, 'devias'],
    [59, 181, 109, 'devias'],
    [59, 187, 226, 'elbeland'], // 30 tiles from the elbeland gate
    [59, 215, 85, 'devias'],
    [59, 219, 199, 'devias'],
    [59, 238, 39, 'lorencia'], // 7 tiles from the lorencia gate
  ],

  // ---- Stadium (World7) ---------------------------------------------------
  // No gate leaves the arena, so every board names the place itself.
  [ENUM_WORLD.WD_6STADIUM]: [
    // type 37 — Object38
    [37, 11, 118, 'stadium'],
    [37, 36, 16, 'stadium'],
    [37, 62, 77, 'stadium'],
    [37, 58, 111, 'stadium'],
    [37, 77, 25, 'stadium'],
    [37, 79, 59, 'stadium'],
    [37, 68, 118, 'stadium'],
    [37, 99, 119, 'stadium'],
  ],

  // ---- Valley of Loren (World31) ------------------------------------------
  // All three stand together in the middle of the valley, 90-odd tiles from
  // either gate.
  [ENUM_WORLD.WD_30BATTLECASTLE]: [
    // type 80 — Object81
    [80, 76, 122, 'valleyOfLoren'],
    [80, 90, 121, 'valleyOfLoren'],
    [80, 90, 129, 'valleyOfLoren'],
  ],
};

const index = new Map<string, LabelKey>();

for (const [world, rows] of Object.entries(SIGNS)) {
  for (const [type, x, y, key] of rows ?? []) {
    index.set(`${world}:${type}:${x}:${y}`, key);
  }
}

/** The types this map labels, for `create.ts` to bind `SignObject` to. */
export function signTypes(world: ENUM_WORLD): number[] {
  const rows = SIGNS[world];
  if (!rows) return [];

  return [...new Set(rows.map(([type]) => type))];
}

/**
 * The text for the sign of `type` standing on `(x, y)`, or null when the
 * placement is not one of the rows above.
 */
export function signLabel(
  world: ENUM_WORLD,
  type: number,
  x: number,
  y: number
): string | null {
  const key = index.get(`${world}:${type}:${Math.round(x)}:${Math.round(y)}`);

  return key ? t(`sign.${key}` as TextKey) : null;
}
