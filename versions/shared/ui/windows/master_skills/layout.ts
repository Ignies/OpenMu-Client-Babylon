/**
 * `CNewUIMasterLevel` geometry in the original's 640×480 UI space
 * (NewUIMasterLevel.cpp: `SetPos`, `Create`, `RenderText`, `RenderIcon`,
 * `RenderToolTip`). The sheet is 640×428 anchored at the top of the screen.
 */

export const SHEET_WIDTH = 640;
export const SHEET_HEIGHT = 428;

/** `new_Master_back01` (512 wide) then `back02` (128) to its right. */
export const BACK_LEFT_SPRITE = 'new_Master_back01.OZJ';
export const BACK_LEFT_WIDTH = 512;
export const BACK_RIGHT_SPRITE = 'new_Master_back02.OZJ';
export const BACK_RIGHT_WIDTH = 128;

/** `m_CloseBT.ChangeButtonInfo(611, 9, 13, 14)`; the sprite is two 13×14 frames. */
export const CLOSE_SPRITE = 'new_Master_exit.OZJ';
export const CLOSE = { x: 611, y: 9, width: 13, height: 14 };

/** Icon atlases: open nodes in colour, closed ones in the grey atlas. */
export const ICON_SPRITE = 'new_Master_Icon.OZJ';
export const ICON_GREY_SPRITE = 'new_Master_non_Icon.OZJ';
/** `new_Master_box.tga`: the 50×38 frame under every node. */
export const BOX_SPRITE = 'new_Master_box.OZT';
export const BOX_WIDTH = 50;
export const BOX_HEIGHT = 38;
/** Icon inset inside the box (`CalcX + 8, CalcY + 5`). */
export const ICON_INSET_X = 8;
export const ICON_INSET_Y = 5;
/** Level number: `CalcX + 8 + 30, CalcY + 28 - 5`. */
export const LEVEL_TEXT_X = ICON_INSET_X + 30;
export const LEVEL_TEXT_Y = 28 - 5;

/** `categoryPos[]`: the top-left node of each of the three groups. */
export const CATEGORY_POS = [
  { x: 11, y: 55 },
  { x: 221, y: 55 },
  { x: 431, y: 55 },
] as const;
/** Node pitch: `index * 49.0f` across, `(rank - 1) * 41.0f` down. */
export const NODE_STEP_X = 49;
export const NODE_STEP_Y = 41;

/** `ArrowDirection` 1…8 → sprite, offset from the node, size (`RenderIcon`). */
export const ARROWS: Record<
  number,
  { file: string; dx: number; dy: number; width: number; height: number }
> = {
  1: { file: 'new_Master_arrow01.OZT', dx: ICON_INSET_X + 20 + 2, dy: 14, width: 28, height: 7 },
  2: { file: 'new_Master_arrow02.OZT', dx: ICON_INSET_X + 20 + 2, dy: 14, width: 28, height: 7 },
  3: { file: 'new_Master_arrow03.OZT', dx: ICON_INSET_X + 10 - 3.5, dy: 28 + 7, width: 7, height: 12 },
  4: { file: 'new_Master_arrow04.OZT', dx: ICON_INSET_X + 10 - 3.5, dy: 28 + 7, width: 7, height: 52 },
  5: { file: 'new_Master_arrow05.OZT', dx: 0, dy: 0, width: 42, height: 31 },
  6: { file: 'new_Master_arrow06.OZT', dx: 0, dy: 0, width: 42, height: 31 },
  7: { file: 'new_Master_arrow07.OZT', dx: ICON_INSET_X + 10 - 1.5, dy: 28 + 8, width: 40, height: 28 },
  8: { file: 'new_Master_arrow08.OZT', dx: 0, dy: 0, width: 40, height: 28 },
};

/** `RenderText`: the header line. */
export const CLASS_NAME_X = 154;
export const MASTER_LEVEL_X = 275;
export const LEVEL_POINT_X = 372;
export const EXP_PERCENT_X = 466;
export const HEADER_Y = 11;
/** Hovering the EXP figure (`CheckMouseIn(458, 11, 81, 10)`) tips the totals at (466, 26). */
export const EXP_HOVER = { x: 458, y: 11, width: 81, height: 10 };
export const EXP_TIP = { x: 466, y: 26 };

/** Category headings, centred (`RT3_SORT_CENTER`) at y 40, RGB(255,155,0). */
export const CATEGORY_TEXT_X = [92, 302, 513] as const;
export const CATEGORY_TEXT_Y = 40;
export const CATEGORY_TEXT_COLOR = 'rgb(255,155,0)';

/** Tooltip anchor below the icon; nodes past y 300 tip upwards instead. */
export const TIP_OFFSET = { x: ICON_INSET_X, y: 33 };
export const TIP_FLIP_Y = 300;

/** `TextListColor` → colour, as `RenderTipTextList` paints them. */
export const TIP_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#ffff96',
  2: '#ff6464',
  4: '#96ff96',
};
