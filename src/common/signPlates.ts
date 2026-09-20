import { DynamicTexture, Texture } from '../libs/babylon/exports';
import type { Scene } from '../libs/babylon/exports';
import { downloadDataFile } from '../libs/mu/dataFolder';
import { onLanguageChanged } from '../i18n';

/**
 * The signpost plates — the small wooden notice boards the map objects carry,
 * and the one place the fake script on them is replaced by a real name.
 *
 * Every signpost in the game draws its writing from one of three 64x64
 * textures: `notice` (Lorencia / Stadium / Valley of Loren), `snotice` (its
 * snowed-over twin in Devias and Santa Town) and `snotice02` (the two-plank
 * road sign, which carries *two* boards in one texture). The lettering baked
 * into all three is decorative nonsense — `Nosdodsodo`, `Kimurj`, `Muy` —
 * drawn at 64x64, so it was never readable as anything else.
 *
 * What happens here: the original texture is fetched once, drawn into a canvas
 * eight times its size, the title band of each board is patched over with a
 * clean strip of its own plank, and the real name is written across it. The
 * result is a `DynamicTexture` bound per mesh through `metadata.diffuseTexture`
 * (itemMaterial.ts) — the shared material is untouched, so two signs a tile
 * apart can read different things.
 *
 * The rest of the texture is copied through at `NEAREST` and is byte-identical
 * to what the sign drew before: only the title band changes.
 *
 * Read by `signObject.ts`. The label strings come from `signLabels.ts`.
 */

/** Texel scale of the drawn copy: 64x64 sources become 512x512. */
const SCALE = 8;

/** One writable board inside a plate texture. All values are source texels. */
type Board = {
  /** Everything the fake title covers; wiped before the label is drawn. */
  band: { x: number; y: number; w: number; h: number };
  /**
   * Where the label is centred and fitted. Usually inset from `band`: the
   * plank of a road sign is wiped edge to edge, but its writing was not.
   */
  title: { x: number; w: number };
  /**
   * Clean rows of the same plank, tiled over `band` at their own size to
   * wipe it. Tiled rather than stretched — three rows pulled to eleven read
   * as a flat panel glued onto the wood, three rows repeated read as wood.
   */
  clean: { x: number; y: number; w: number; h: number };
  /** Ink colour, matched to the lettering the board had. */
  ink: string;
};

type Plate = {
  /** Where the original lives, relative to `Data/`. */
  file: string;
  boards: Board[];
};

/**
 * Keyed by the folder the model came out of plus the texture's own name, as
 * `signObject.ts` reads them off the mesh — `snotice` is a different file in
 * `Object3` and `Object63` even though both are called that.
 */
const PLATES: Record<string, Plate> = {
  // Lorencia's `Sign01` / `Sign02`, and the same plaque in Stadium and the
  // Valley of Loren. One board: the brass plaque, screws at its four corners.
  'object1/notice': plaque('Object1/notice.OZJ', 5),
  'object7/notice': plaque('Object7/notice.OZJ', 5),
  'object31/notice': plaque('Object31/notice.OZJ', 5),
  // The snowed-over plaque: the same layout under a white crust, drawn two
  // texels lower to make room for it.
  'object3/snotice': plaque('Object3/snotice.OZJ', 7),
  'object63/snotice': plaque('Object63/snotice.OZJ', 7),
  // The two-plank road sign. The texture holds two complete boards stacked,
  // and a model uses one or the other; both are written, and whichever the
  // mesh does not show costs nothing.
  'object3/snotice02': planks('Object3/snotice02.OZJ'),
  'object63/snotice02': planks('Object63/snotice02.OZJ'),
};

/**
 * The brass plaque, whose script runs for eleven texels from `titleY` and is
 * followed by three clean ones before the first line of body dashes. Those
 * three are what erases it: taken from immediately under the band, they carry
 * the same grain and the same shading, so the patch leaves no visible edge.
 * (Row-by-row contrast over x 11..54 of the shipped textures: lettering
 * 5..14 on `notice`, 8..16 on `snotice`; body dashes every three or four
 * rows after that.)
 */
function plaque(file: string, titleY: number): Plate {
  return {
    file,
    boards: [
      {
        // Inside the four corner screws, which stay where they are.
        band: { x: 11, y: titleY, w: 44, h: 11 },
        title: { x: 11, w: 44 },
        clean: { x: 11, y: titleY + 11, w: 44, h: 3 },
        ink: '#1d1409',
      },
    ],
  };
}

/**
 * The stacked planks: an upper board lettered in orange and a lower one in
 * black, each under its own crust of snow. The bands start one texel below
 * the snow line (6 and 38) so the crust survives, and the clean rows are the
 * last of the plank before its bottom seam — this wood is grainy enough that
 * nothing nearer the band reads as blank.
 */
function planks(file: string): Plate {
  return {
    file,
    boards: [
      {
        // The plank runs the full width of the texture, so the wipe does
        // too: an inset one would show its own corners on the board.
        band: { x: 0, y: 6, w: 64, h: 14 },
        title: { x: 8, w: 48 },
        clean: { x: 0, y: 28, w: 64, h: 3 },
        ink: '#c86a10',
      },
      {
        band: { x: 0, y: 38, w: 64, h: 14 },
        title: { x: 8, w: 48 },
        clean: { x: 0, y: 60, w: 64, h: 3 },
        ink: '#191009',
      },
    ],
  };
}

/** Is this `<dir>/<texture>` pair one of the plates? */
export function isSignPlate(key: string): boolean {
  return key.toLowerCase() in PLATES;
}

/**
 * Warm the plates a map's signs will ask for, called from its `create.ts`
 * before any object is instantiated. Without it the first sign to load starts
 * the fetch, and on a cold server it queues behind the map's own downloads —
 * the board then stands in its fake script for a second or two before the
 * real name lands.
 */
export function prefetchSignPlates(objectDir: string): void {
  const prefix = objectDir.toLowerCase();

  for (const key of Object.keys(PLATES)) {
    if (key.startsWith(prefix)) void plateSource(key);
  }
}

const sources = new Map<string, Promise<ImageBitmap | null>>();
const textures = new Map<string, Texture>();

onLanguageChanged(() => {
  // The labels are localised; the drawn copies are not reusable across a
  // language change. The sources (the untouched originals) still are.
  for (const texture of textures.values()) texture.dispose();
  textures.clear();
});

/** The untouched original, decoded once per plate and kept for the session. */
function plateSource(key: string): Promise<ImageBitmap | null> {
  let pending = sources.get(key);

  if (!pending) {
    pending = decodePlate(PLATES[key].file).catch(err => {
      console.error(`Could not decode the sign plate ${key}:`, err);
      return null;
    });
    sources.set(key, pending);
  }

  return pending;
}

/** OZJ is a JPEG behind a 24-byte header; the browser does the decode. */
async function decodePlate(file: string): Promise<ImageBitmap> {
  const bytes = await downloadDataFile(file);

  if (bytes.length < 24) {
    throw new Error(`${file} is too small to be an OZJ`);
  }

  const blob = new Blob([bytes.slice(24) as BlobPart], { type: 'image/jpeg' });

  return createImageBitmap(blob);
}

/**
 * The plate of `key` with `label` written across every board on it, or null
 * when the original could not be read (the sign then keeps the texture the
 * GLB shipped with, fake script and all).
 */
export async function labelledPlate(
  scene: Scene,
  key: string,
  label: string
): Promise<Texture | null> {
  const plate = PLATES[key.toLowerCase()];
  if (!plate) return null;

  const cacheKey = `${key.toLowerCase()}|${label}`;
  const cached = textures.get(cacheKey);
  if (cached) return cached;

  const source = await plateSource(key.toLowerCase());
  if (!source) return null;

  // Two signs with the same label can both get here while the source decodes.
  const raced = textures.get(cacheKey);
  if (raced) return raced;

  const width = source.width * SCALE;
  const height = source.height * SCALE;

  // The plank, the frame, the screws and the body text are the original's,
  // pixel for pixel — only the title band of each board is repainted.
  const drawn = new OffscreenCanvas(width, height);
  const paint = drawn.getContext('2d') as OffscreenCanvasRenderingContext2D;

  paint.imageSmoothingEnabled = false;
  paint.drawImage(source, 0, 0, width, height);

  for (const board of plate.boards) drawBoard(paint, source, board, label);

  const texture = new DynamicTexture(
    `signPlate_${cacheKey}`,
    { width, height },
    scene,
    true,
    Texture.NEAREST_NEAREST
  );

  const ctx = texture.getContext() as CanvasRenderingContext2D;

  // Babylon uploads a glTF texture bottom-up and a DynamicTexture's canvas
  // as it stands, so a straight copy of the original comes out mirrored in
  // V: on Lorencia's `Sign02` the repainted title band landed across the two
  // posts (which sample rows 44..60, the mirror of the band) and the board
  // itself showed bare plank. Flipping the finished image once here puts
  // every texel back where the GLB's own texture had it — and the label,
  // drawn the right way up above, comes out the right way up too.
  ctx.imageSmoothingEnabled = false;
  ctx.translate(0, height);
  ctx.scale(1, -1);
  ctx.drawImage(drawn, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  texture.update(true);
  texture.anisotropicFilteringLevel = 1;

  textures.set(cacheKey, texture);

  return texture;
}

function drawBoard(
  ctx: OffscreenCanvasRenderingContext2D,
  source: ImageBitmap,
  board: Board,
  label: string
): void {
  const { band, title, clean } = board;

  // Erase the fake script under a tiling of clean plank. `imageSmoothing` is
  // still off, so every copy is the source rows at texel size.
  for (let y = 0; y < band.h; y += clean.h) {
    const rows = Math.min(clean.h, band.h - y);

    ctx.drawImage(
      source,
      clean.x,
      clean.y,
      clean.w,
      rows,
      band.x * SCALE,
      (band.y + y) * SCALE,
      band.w * SCALE,
      rows * SCALE
    );
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;

  const boxWidth = title.w * SCALE;
  const boxHeight = band.h * SCALE;
  const centreX = title.x * SCALE + boxWidth / 2;
  const centreY = band.y * SCALE + boxHeight / 2;

  // Start from the band height and shrink until the name fits its width. A
  // long name on a narrow plank ends up smaller rather than clipped.
  let fontSize = Math.round(boxHeight * 0.82);
  for (; fontSize > 8; fontSize--) {
    ctx.font = font(fontSize);
    if (ctx.measureText(label).width <= boxWidth * 0.94) break;
  }

  // A soft drop shadow: the plate is lit from above in every map that has one,
  // and flat ink on flat wood reads as a decal without it.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillText(label, centreX + fontSize * 0.05, centreY + fontSize * 0.07);

  ctx.fillStyle = board.ink;
  ctx.fillText(label, centreX, centreY);

  ctx.restore();
}

/**
 * A serif face for the wood, with the UI stack behind it so a pack whose
 * script Georgia has no glyphs for (CJK, Thai) still draws (muText/style.less).
 */
function font(size: number): string {
  return `bold ${size}px Georgia, 'Times New Roman', Tahoma, 'Malgun Gothic', 'Microsoft YaHei', 'Leelawadee UI', serif`;
}
