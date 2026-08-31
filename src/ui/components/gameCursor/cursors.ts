
export type CursorKind =
  | 'normal'
  | 'push'
  | 'attack'
  | 'get'
  | 'talk'
  | 'lean'
  | 'sit'
  | 'dontMove'
  | 'repair';

export const CURSOR_FILES: Record<CursorKind, string> = {
  normal: 'Cursor.ozt',
  repair: 'CursorRepair.OZT',
  push: 'CursorPush.ozt',
  attack: 'CursorAttack.ozt',
  get: 'CursorGet.ozt',
  talk: 'CursorTalk.ozt',
  lean: 'CursorLeanAgainst.ozt',
  sit: 'CursorSitDown.ozt',
  dontMove: 'CursorDontMove.OZT',
};

export const CURSOR_SPRITES: readonly string[] = Object.values(CURSOR_FILES);

export const CURSOR_FRAME_SIZE = 32;

export const CURSOR_SCALE = 1.5;

export const CURSOR_SIZE = 24 * CURSOR_SCALE;

export const CURSOR_HOTSPOT = 2 * CURSOR_SCALE;

export function talkCursorFrame(worldTimeMs: number): { x: number; y: number } {
  const frame = Math.floor(worldTimeMs * 0.01) % 6;

  return {
    x: frame === 1 || frame === 3 || frame === 5 ? 1 : 0,
    y: frame === 2 || frame === 3 || frame === 4 ? 1 : 0,
  };
}

export type CursorHover = Extract<
  CursorKind,
  'get' | 'talk' | 'attack' | 'lean' | 'sit'
>;
