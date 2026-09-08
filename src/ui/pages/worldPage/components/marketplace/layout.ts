/**
 * Where everything sits on the frame art (`public/ui/marketplace_frame.png`).
 *
 * The skin draws its own slots - a title plaque, a sort dropdown, a search
 * field, two view buttons, a category rail and nine list bands - so the DOM
 * does not lay itself out here, it lands on those slots. Every number below is
 * a pixel measured off the source image; `pctX` / `pctY` turn them into
 * percentages so the whole window scales as one piece.
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

/** The shaped bar across the top: title, tabs and the wallet ride on it. */
export const PLAQUE = box(126, 190, 880, 243);

/** Top right of the frame, on the beam above the view buttons. */
export const CLOSE = box(1444, 190, 1492, 238);

/** The dropdown, the search field and the two view buttons the art draws. */
export const SORT = box(384, 260, 606, 306);
export const SEARCH = box(620, 260, 1360, 306);
export const VIEW_LIST = box(1376, 261, 1418, 305);
export const VIEW_GRID = box(1436, 261, 1478, 305);

/** The sidebar. Categories fill it from the top, the pager sits at its foot. */
export const RAIL = box(126, 262, 340, 922);
export const RAIL_PAGER_H = 96;

/** The list area, and the nine bands the art rules across it. */
export const CONTENT = box(384, 327, 1478, 941);
export const ROWS = 9;
/** Band height in image pixels, so a row lands between two ruled lines. */
export const ROW_H = (941 - 327) / ROWS;
export const ROW_H_PCT = `${(ROW_H / (941 - 327)) * 100}%`;
