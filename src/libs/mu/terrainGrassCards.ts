import { RawTexture, Texture, type Scene } from '../babylon/exports';
import { decodeTGA } from './tga';
import { fetchTerrainFile } from './prefetchWorld';

/**
 * The map's own grass art, and the answer to which tiles grow anything.
 *
 * The original draws its grass pass from a *separate* texture set -
 * `TileGrass01/02/03.OZT`, alpha cards of grass tufts - indexed by the tile's
 * first splat layer: `BITMAP_MAPGRASS + TerrainMappingLayer1[...]`
 * (ZzzLodTerrain.cpp:1620). Then:
 *
 * ```cpp
 * BITMAP_t* pBitmap = Bitmaps.FindTexture(Texture);
 * if (pBitmap) { ...draw the card... }
 * ```
 *
 * **That null check is the whole per-map rule**, and it is why the first cut
 * of this layer put grass in the Dungeon and on Devias' ice. Slot 0 is named
 * `TileGrass01`, but the name is a filename convention, not a statement about
 * what the texture depicts: `World2/TileGrass01.jpg` is dungeon flagstone and
 * `World3/TileGrass01.jpg` is ice. What actually decides is whether the world
 * folder ships the matching *card*:
 *
 * | World | Grass01 | Grass02 | Grass03 |
 * | --- | --- | --- | --- |
 * | 1 Lorencia | card | card | card |
 * | 2 Dungeon | - | - | - |
 * | 3 Devias | - | card | - |
 * | 4 Lost Tower | card | - | card |
 * | 8 Tarkan | - | - | - |
 *
 * So the Dungeon grows nothing, and Devias grows grass only where its splat
 * says layer 1 - on the ice, which is right: Devias' card is *frosted* grass,
 * pale blue-white, authored for exactly that.
 *
 * Which is also why the blade takes its colour from here and not from the
 * ground tile it stands on. The ground tile is ice; the grass is frost-white
 * grass. One is the floor, the other is the plant, and the original always
 * kept them as two different textures.
 */

/** `BITMAP_MAPGRASS + layer1` reaches these three, and no more. */
export const GRASS_CARD_SLOTS = 3;

/** Rows in the ramp, per slot. The cards are 64 tall. */
const RAMP_ROWS = 64;

/**
 * A texel this transparent is a gap between tufts, not grass; letting it into
 * the average pulls the whole ramp toward whatever the card's dead space
 * happens to be.
 */
const ALPHA_FLOOR = 8;

export type GrassCards = {
  /** Splat layer-1 values that grow grass on this map. Empty = none. */
  readonly slots: ReadonlySet<number>;
  /**
   * `GRASS_CARD_SLOTS` wide, `RAMP_ROWS` tall: the card's alpha-weighted mean
   * colour per row, so x picks the slot and y is the height up the blade.
   * Null when the map has no cards at all.
   */
  readonly ramp: Texture | null;
};

export const NO_GRASS_CARDS: GrassCards = { slots: new Set(), ramp: null };

/**
 * The card reduced to one colour per row.
 *
 * Sampling the card directly would be closer to the original still, but a
 * blade is one to three pixels wide and the card is mostly gaps: a strip
 * through it lands in dead space as often as on a tuft. The alpha-weighted
 * row mean is the colour the eye reads off that row of the card anyway, and
 * it carries the authored root-to-tip gradient, which is the part that
 * matters.
 */
function rampRows(pixels: Uint8ClampedArray, width: number, height: number) {
  const rows = new Float32Array(RAMP_ROWS * 3);

  for (let r = 0; r < RAMP_ROWS; r++) {
    // v = 0 is the blade's root, which is the *bottom* of the card.
    const y = Math.min(height - 1, Math.round(((RAMP_ROWS - 1 - r) / (RAMP_ROWS - 1)) * (height - 1)));

    let weight = 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = pixels[i + 3];

      if (a < ALPHA_FLOOR) continue;

      const w = a / 255;
      weight += w;
      sr += pixels[i] * w;
      sg += pixels[i + 1] * w;
      sb += pixels[i + 2] * w;
    }

    if (weight > 0) {
      rows[r * 3] = sr / weight;
      rows[r * 3 + 1] = sg / weight;
      rows[r * 3 + 2] = sb / weight;
    }
  }

  return rows;
}

/**
 * Fetch and reduce whatever cards this world ships. A slot whose file is
 * missing is simply absent from `slots` - the same answer the original's
 * `FindTexture` null gives, reached the same way.
 */
export async function loadGrassCards(
  scene: Scene,
  worldNum: number
): Promise<GrassCards> {
  const slots = new Set<number>();
  const bytes = new Uint8Array(GRASS_CARD_SLOTS * RAMP_ROWS * 4);

  await Promise.all(
    Array.from({ length: GRASS_CARD_SLOTS }, async (_, slot) => {
      const name = `World${worldNum}/TileGrass0${slot + 1}.OZT`;

      let rows: Float32Array;

      try {
        // OZT is a TGA behind a 4-byte header, like everywhere else.
        const file = await fetchTerrainFile(name);
        const card = decodeTGA(name, file.slice(4));

        rows = rampRows(card.pixels, card.width, card.height);
      } catch {
        // No card: this slot grows nothing on this map. Not an error - it is
        // how the original says "no grass here" (Dungeon says it three times).
        return;
      }

      slots.add(slot);

      for (let r = 0; r < RAMP_ROWS; r++) {
        const i = (r * GRASS_CARD_SLOTS + slot) * 4;

        bytes[i] = rows[r * 3];
        bytes[i + 1] = rows[r * 3 + 1];
        bytes[i + 2] = rows[r * 3 + 2];
        bytes[i + 3] = 255;
      }
    })
  );

  if (!slots.size) return NO_GRASS_CARDS;

  const ramp = RawTexture.CreateRGBATexture(
    bytes,
    GRASS_CARD_SLOTS,
    RAMP_ROWS,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );

  ramp.name = 'terrainGrassRamp';
  ramp.wrapU = Texture.CLAMP_ADDRESSMODE;
  ramp.wrapV = Texture.CLAMP_ADDRESSMODE;

  return { slots, ramp };
}
