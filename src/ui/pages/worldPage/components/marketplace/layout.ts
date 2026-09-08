/**
 * Where everything sits on the frame art (`public/ui/marketplace_frame.png`).
 *
 * The art is chrome only - awnings, gold frame, a title plaque and the rail
 * divider - so it gives the window three regions and draws no controls of its
 * own. Everything inside those regions is drawn by the stylesheet.
 *
 * Every number is a pixel measured off the source image; `pctX` / `pctY` turn
 * them into percentages so the window scales as one piece.
 */
export const FRAME_SRC = '/ui/marketplace_frame.png';

/** The art's own size. The window keeps this aspect ratio at every scale. */
export const FRAME_W = 1595;
export const FRAME_H = 986;

export const pctX = (px: number): string => `${(px / FRAME_W) * 100}%`;
export const pctY = (px: number): string => `${(px / FRAME_H) * 100}%`;

/** Left/top/width/height in image pixels, as a positioned CSS box. */
export const box = (l: number, t: number, r: number, b: number) => ({
  left: pctX(l),
  top: pctY(t),
  width: pctX(r - l),
  height: pctY(b - t),
});

/**
 * The shaped bar across the top. It ends in an arrow point at x 869-878, so
 * the usable run stops short of that.
 */
export const PLAQUE = box(118, 192, 864, 242);

/** The sidebar, inside the gold rail at x 101-334. */
export const RAIL = box(110, 266, 330, 924);

/** The main area, inside the gold rail at x 359-1498. */
export const CONTENT = box(368, 266, 1492, 924);
