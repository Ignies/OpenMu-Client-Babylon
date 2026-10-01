import './style.less';
import type { CSSProperties } from 'react';

/**
 * The original's text is not a glyph atlas: `CUIRenderTextOriginal` draws
 * with GDI into a 640×480 DIB and uploads the strip as a texture
 * (UIControls.cpp:2647). The faces are created in Winmain.cpp:1251-1254:
 *
 *   g_hFont      Tahoma, FW_NORMAL,   height FontHeight - 1  (11 px at 480p)
 *   g_hFontBold  Tahoma, FW_SEMIBOLD, same height
 *   g_hFontBig   Tahoma, FW_SEMIBOLD, double height
 *   g_hFixFont   Tahoma, FW_NORMAL,   13 px (14 px above 600 lines)
 *
 * with `FontHeight = ceil(12 + (WindowHeight - 480) / 200)`. These classes
 * are those four faces so every window labels itself the same way; the
 * `RenderText` background box (`SetBgColor`) is the `background` prop.
 */

export type MuFontFace = 'normal' | 'bold' | 'big' | 'fix';

export const MU_FONT_FAMILY = 'Tahoma, Verdana, sans-serif';

export const MU_FONT_CLASS: Record<MuFontFace, string> = {
  normal: 'mu-text',
  bold: 'mu-text mu-text-bold',
  big: 'mu-text mu-text-big',
  fix: 'mu-text mu-text-fix',
};

type MuTextProps = {
  text?: string;
  face?: MuFontFace;
  color?: string;
  /** `g_pRenderText->SetBgColor`: the box painted behind the glyphs. */
  background?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
};

export const MuText = ({
  text,
  face = 'normal',
  color,
  background,
  align,
  className,
  style,
  children,
}: MuTextProps) => (
  <span
    className={`${MU_FONT_CLASS[face]}${className ? ` ${className}` : ''}`}
    style={{
      color,
      background,
      textAlign: align,
      ...style,
    }}
  >
    {text}
    {children}
  </span>
);

type MuTipTextProps = {
  text: string;
  background?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * `RenderTipText` (ZzzInterface.cpp:444): white `g_hFont` text on a
 * black(0.8) box with a 1 px black outline, 2 px of padding. The minimap's
 * marker tip is the same box at black(180/255).
 */
export const MuTipText = ({
  text,
  background = 'rgba(0,0,0,0.8)',
  className,
  style,
}: MuTipTextProps) => (
  <div
    className={`mu-tip-text${className ? ` ${className}` : ''}`}
    style={{ background, ...style }}
  >
    {text}
  </div>
);
