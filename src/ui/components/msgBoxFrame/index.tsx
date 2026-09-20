import type { CSSProperties, ReactNode } from 'react';
import { MuSpriteFrame } from '../muSprite';

/**
 * The original's three-slice message box (`CNewUIMessageBoxMng::LoadImages`,
 * NewUIMessageBox.cpp:444): a 230-wide frame over a stretched fill, whose
 * middle slice repeats once per line. Every window built on the message box
 * art is this frame with a different number of middle slices - the two-field
 * economy prompt takes 8, the Kanturu gateway dialog takes 10
 * (`RenderFrame`, NewUIKanturuEvent.cpp).
 *
 * Driven by: whoever renders it. Read by: nobody - it holds no state.
 */

export const MSGBOX_BACK_SPRITE = 'newui_msgbox_back.OZJ';
export const MSGBOX_TOP_SPRITE = 'newui_msgbox_top.OZT';
export const MSGBOX_MIDDLE_SPRITE = 'newui_msgbox_middle.OZT';
export const MSGBOX_BOTTOM_SPRITE = 'newui_msgbox_bottom.OZT';

export const MSGBOX_SPRITES = [
  MSGBOX_BACK_SPRITE,
  MSGBOX_TOP_SPRITE,
  MSGBOX_MIDDLE_SPRITE,
  MSGBOX_BOTTOM_SPRITE,
];

// `MSGBOX_WIDTH`, `MSGBOX_TOP_HEIGHT`, `MSGBOX_MIDDLE_HEIGHT`,
// `MSGBOX_BOTTOM_HEIGHT` (NewUICommonMessageBox.h:30).
export const MSGBOX_WIDTH = 230;
export const MSGBOX_TOP_HEIGHT = 67;
export const MSGBOX_MIDDLE_HEIGHT = 15;
export const MSGBOX_BOTTOM_HEIGHT = 50;

// `MSGBOX_BACK_BLANK_WIDTH` / `_HEIGHT`: the fill is stretched a little
// smaller than the frame so the frame's own edge stays on top of it.
export const MSGBOX_BACK_TOP = 2;
export const MSGBOX_BACK_BLANK_WIDTH = 8;
export const MSGBOX_BACK_BLANK_HEIGHT = 10;

/** The box's height for `lines` middle slices. */
export function msgBoxHeight(lines: number): number {
  return MSGBOX_TOP_HEIGHT + MSGBOX_MIDDLE_HEIGHT * lines + MSGBOX_BOTTOM_HEIGHT;
}

type MsgBoxFrameProps = {
  /** Middle slices; the box grows by `MSGBOX_MIDDLE_HEIGHT` each. */
  lines: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export const MsgBoxFrame = ({ lines, className, style, children }: MsgBoxFrameProps) => {
  const height = msgBoxHeight(lines);

  return (
    <div className={className} style={{ width: MSGBOX_WIDTH, height, ...style }}>
      <MuSpriteFrame
        file={MSGBOX_BACK_SPRITE}
        style={{
          position: 'absolute',
          left: 0,
          top: MSGBOX_BACK_TOP,
          width: MSGBOX_WIDTH - MSGBOX_BACK_BLANK_WIDTH,
          height: height - MSGBOX_BACK_BLANK_HEIGHT,
          backgroundSize: '100% 100%',
        }}
      />
      <MuSpriteFrame
        file={MSGBOX_TOP_SPRITE}
        width={MSGBOX_WIDTH}
        height={MSGBOX_TOP_HEIGHT}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <MuSpriteFrame
        file={MSGBOX_MIDDLE_SPRITE}
        width={MSGBOX_WIDTH}
        height={MSGBOX_MIDDLE_HEIGHT * lines}
        style={{
          position: 'absolute',
          left: 0,
          top: MSGBOX_TOP_HEIGHT,
          backgroundRepeat: 'repeat-y',
        }}
      />
      <MuSpriteFrame
        file={MSGBOX_BOTTOM_SPRITE}
        width={MSGBOX_WIDTH}
        height={MSGBOX_BOTTOM_HEIGHT}
        style={{ position: 'absolute', left: 0, top: height - MSGBOX_BOTTOM_HEIGHT }}
      />
      {children}
    </div>
  );
};
