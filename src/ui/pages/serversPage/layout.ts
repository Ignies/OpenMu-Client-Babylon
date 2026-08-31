
export const SPRITE = {
  groupButton: 'cha_bt.OZT',
  serverButton: 'server_b2_all.OZT',
  gauge: 'server_b2_loding.OZJ',
  deco: 'server_deco_all.OZT',
  descEdge: 'server_ex01.OZT',
  descSide: 'server_ex02.OZJ',
  descFill: 'server_ex03.OZT',
} as const;

export const GROUP_BTN_WIDTH = 108;
export const GROUP_BTN_HEIGHT = 26;
export const SERVER_BTN_WIDTH = 193;
export const SERVER_BTN_HEIGHT = 26;

export const GAP_WIDTH = 28;
export const GAP_HEIGHT = 5;

export const LEFT_GROUP_MAX = 10;
export const RIGHT_GROUP_MAX = 10;
export const SERVER_MAX = 16;

export const GAUGE_OFFSET_X = 16;
export const GAUGE_OFFSET_Y = 19;
export const GAUGE_WIDTH = 160;
export const GAUGE_HEIGHT = 4;

export const DESC_WIDTH = 512;
export const DESC_EDGE_HEIGHT = 6;
export const DESC_SIDE_HEIGHT = 4;
export const DESC_LINES = 10;
export const DESC_HEIGHT =
  DESC_EDGE_HEIGHT * 2 + DESC_SIDE_HEIGHT * DESC_LINES;

export const WIN_WIDTH =
  (GROUP_BTN_WIDTH + GAP_WIDTH) * 2 + SERVER_BTN_WIDTH;
export const WIN_HEIGHT =
  SERVER_BTN_HEIGHT * SERVER_MAX +
  GAP_HEIGHT * 2 +
  GROUP_BTN_HEIGHT +
  DESC_HEIGHT;

export const GROUP_BASE_Y =
  WIN_HEIGHT - (GROUP_BTN_HEIGHT * 11 + GAP_HEIGHT * 2 + DESC_HEIGHT);

export const LEFT_GROUP_X = 0;
export const RIGHT_GROUP_X =
  GROUP_BTN_WIDTH + SERVER_BTN_WIDTH + GAP_WIDTH * 2;

export const CENTER_GROUP_X = Math.floor((WIN_WIDTH - GROUP_BTN_WIDTH) / 2);
export const CENTER_GROUP_Y =
  WIN_HEIGHT - GROUP_BTN_HEIGHT - GAP_HEIGHT - DESC_HEIGHT;

export const SERVER_BTN_X = LEFT_GROUP_X + GROUP_BTN_WIDTH + GAP_WIDTH;

export const DESC_X = -Math.floor((DESC_WIDTH - WIN_WIDTH) / 2);
export const DESC_Y = WIN_HEIGHT - DESC_HEIGHT;

export const DECO = {
  left: { x: 0, y: 0, width: 68, height: 95 },
  right: { x: 68, y: 0, width: 68, height: 95 },
  arrowLeft: { x: 136, y: 0, width: 23, height: 29 },
  arrowRight: { x: 136, y: 30, width: 23, height: 29 },
} as const;

export function serverListTop(serverCount: number): number {
  const columnHeight = GROUP_BTN_HEIGHT * LEFT_GROUP_MAX;
  const listHeight = SERVER_BTN_HEIGHT * serverCount;

  return columnHeight > listHeight
    ? GROUP_BASE_Y
    : GROUP_BASE_Y - (listHeight - columnHeight);
}

export const TEXT_COLOR = {
  white: '#ffffff',
  brightGray: '#e2e2e2',
  yellow: '#ffff79',
  brightYellow: '#ffeec1',
  orange: '#ffb400',
  brightOrange: '#ffd927',
} as const;
