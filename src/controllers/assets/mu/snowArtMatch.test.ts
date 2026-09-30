import { describe, expect, it } from 'vitest';
import { SNOW_ART, artMatch } from './artMatch';

/**
 * Mean sRGB of the tile textures the maps actually ship
 * (`Data/World<n>/Tile*.OZJ`, every 4th texel), by slot in `FULL_TILES`
 * order. These are the numbers `SNOW_ART` was set against, so a change to
 * either ramp has to be argued against the real art here rather than
 * eyeballed on one screenshot.
 */
const TILES: Record<string, Record<number, readonly [number, number, number]>> =
  {
    // Devias (World3): snow painted into the grass and the rock, a neutral
    // grey field ground, dark boards and rocks.
    devias: {
      0: [216, 229, 232], // TileGrass01 - painted snow
      1: [220, 231, 234], // TileGrass02 - painted snow
      2: [114, 114, 118], // TileGround01 - the open field's grey ground
      3: [60, 46, 36], // TileGround02 - boards
      4: [153, 153, 149], // TileGround03 - cobbles
      5: [87, 117, 120], // TileWater01
      6: [114, 140, 149], // TileWood01 - frosted blue stone
      7: [181, 210, 219], // TileRock01 - painted snow
      8: [66, 73, 75], // TileRock02 - dark rock
    },
    // Santa Town (World63): a snow village drawn over DARK ground. The layer
    // is what whitens it, so none of its ground may be read as already snow.
    santaTown: {
      0: [68, 83, 71], // TileGrass01 - dark grass
      1: [51, 65, 58], // TileGrass02 - dark grass
      2: [38, 43, 47], // TileGround01 - dark ground
      3: [205, 224, 229], // TileGround02 - painted snow
      4: [59, 22, 1], // TileGround03 - embers
      5: [97, 185, 219], // TileWater01 - bright, but blue
      7: [188, 203, 213], // TileRock01 - painted snow
    },
    // The ice fields (World58). They draw no layer at all now
    // (`snowfall: false`), but their art is the clearest case of the two
    // things the ramps have to tell apart: white ice and blue ice.
    laCleon: {
      0: [197, 215, 226], // TileGrass01 - white ice
      2: [33, 131, 166], // TileGround01 - deep blue ice
      5: [97, 185, 219], // TileWater01 - blue ice
      7: [210, 230, 243], // TileRock01 - white ice
      8: [125, 207, 222], // TileRock02 - blue ice
    },
  };

const match = (rgb: readonly [number, number, number]) =>
  artMatch(SNOW_ART, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

/** Tiles the layer must stand aside on: the art is already snow. */
const DEFERS: readonly (readonly [string, number])[] = [
  ['devias', 0],
  ['devias', 1],
  ['devias', 7],
  ['santaTown', 3],
  ['santaTown', 7],
  ['laCleon', 0],
  ['laCleon', 7],
];

/** Tiles the layer must still cover: no snow is painted into them. */
const COVERS: readonly (readonly [string, number])[] = [
  ['devias', 2],
  ['devias', 3],
  ['devias', 4],
  ['devias', 5],
  ['devias', 6],
  ['devias', 8],
  ['santaTown', 0],
  ['santaTown', 1],
  ['santaTown', 2],
  ['santaTown', 4],
  ['santaTown', 5],
  ['laCleon', 2],
  ['laCleon', 5],
  ['laCleon', 8],
];

describe('settled snow defers to the map art', () => {
  it.each(DEFERS)('stands aside on %s tile %i', (map, slot) => {
    expect(match(TILES[map][slot])).toBeGreaterThan(0.7);
  });

  it.each(COVERS)('still covers %s tile %i', (map, slot) => {
    expect(match(TILES[map][slot])).toBeLessThan(0.1);
  });

  it('keeps Santa Town coverable: the village is snow over dark ground', () => {
    // The regression this guards: widening the luminance ramp downward to
    // catch one grey tile on another map would stop Santa Town whitening at
    // all, and it has no painted snow of its own to fall back on.
    for (const slot of [0, 1, 2]) {
      expect(match(TILES.santaTown[slot])).toBe(0);
    }
  });

  it('separates white ice from blue ice on brightness alone', () => {
    // Both are bright. Only the chroma ramp tells them apart, which is why
    // luminance on its own is not enough to read a map's art.
    expect(match(TILES.laCleon[7])).toBeGreaterThan(0.7);
    expect(match(TILES.laCleon[8])).toBe(0);
    expect(match(TILES.laCleon[5])).toBe(0);
  });

  it('is monotonic in brightness for a neutral colour', () => {
    let last = -1;
    for (let v = 0; v <= 255; v += 5) {
      const here = match([v, v, v]);
      expect(here).toBeGreaterThanOrEqual(last);
      last = here;
    }
    expect(match([255, 255, 255])).toBe(1);
    expect(match([0, 0, 0])).toBe(0);
  });
});
