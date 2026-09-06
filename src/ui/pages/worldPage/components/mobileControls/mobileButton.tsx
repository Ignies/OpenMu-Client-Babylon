import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { uiClick } from '../../../../../libs/sfx';

/**
 * A touch button. `MuButton` cannot serve here: its hover and pressed frames
 * come from `onMouseEnter` / `onMouseDown`, which a browser only synthesises
 * after the finger has already left the glass, so on a phone it never looks
 * pressed. This drives the same frame swap from pointer events, and adds the
 * long press the skill pad needs.
 */

/** Held this long (ms) without moving, a press is a long press, not a tap. */
const LONG_PRESS_MS = 400;
/** Pixels the finger may wander before the press stops counting as either. */
const SLOP = 12;

type MobileButtonProps = {
  onTap?: () => void;
  onLongPress?: () => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Rendered with `pressed` so the caller can swap its own art. */
  children: (pressed: boolean) => ReactNode;
};

export const MobileButton = ({
  onTap,
  onLongPress,
  className,
  style,
  title,
  children,
}: MobileButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const press = useRef<{ x: number; y: number; timer: number; long: boolean } | null>(null);

  const end = () => {
    const held = press.current;
    press.current = null;
    setPressed(false);
    if (held) window.clearTimeout(held.timer);
    return held;
  };

  return (
    <div
      className={className}
      title={title}
      style={style}
      onPointerDown={e => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setPressed(true);
        const timer = window.setTimeout(() => {
          if (!press.current) return;
          press.current.long = true;
          setPressed(false);
          uiClick(onLongPress)();
        }, LONG_PRESS_MS);
        press.current = { x: e.clientX, y: e.clientY, timer, long: false };
      }}
      onPointerMove={e => {
        const held = press.current;
        if (!held) return;
        if (Math.hypot(e.clientX - held.x, e.clientY - held.y) > SLOP) end();
      }}
      onPointerUp={e => {
        e.stopPropagation();
        const held = end();
        if (held && !held.long) uiClick(onTap)();
      }}
      onPointerCancel={end}
      // The world reads the raw pointer stream off the canvas; a press that
      // started on a button is never also a click on the ground behind it.
      onContextMenu={e => e.preventDefault()}
    >
      {children(pressed)}
    </div>
  );
};

/**
 * A sprite cell drawn larger than its own pixels. The sheets are 30x41 and
 * 32x38 - thumb targets have to be about half again that - and `transform`
 * keeps the nearest-neighbour look the rest of the UI has.
 */
export const ScaledFrame = ({
  file,
  x = 0,
  y = 0,
  width,
  height,
  scale,
  style,
  children,
}: {
  file: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  scale: number;
  style?: CSSProperties;
  children?: ReactNode;
}) => (
  <div
    className="mobile-scaled"
    style={{ width: width * scale, height: height * scale, ...style }}
  >
    <MuSpriteFrame
      file={file}
      x={x}
      y={y}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      }}
    />
    {/* Outside the scaled frame on purpose: what sits on the box (an icon, a
        cooldown sweep) is sized in final screen pixels, not sheet pixels. */}
    {children}
  </div>
);
