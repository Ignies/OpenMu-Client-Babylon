import { useState, type CSSProperties } from 'react';
import { MuSpriteFrame } from './muSprite';

/**
 * The client's `ui/components/muButton`, minus `libs/sfx` — this page has no
 * audio engine and a register form does not need click sounds. Frame layout is
 * the same: the sheet stacks states vertically, so frame *n* sits at `y = n *
 * height`.
 */

export type MuButtonFrames = {
  up: number;
  active?: number;
  down?: number;
};

type MuButtonProps = {
  file: string;
  width: number;
  height: number;
  frames: MuButtonFrames;
  label?: string;
  color?: string;
  activeColor?: string;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

export const MuButton = ({
  file,
  width,
  height,
  frames,
  label,
  color = '#e2e2e2',
  activeColor = '#ffffff',
  disabled = false,
  onClick,
  style,
}: MuButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  let frame = frames.up;

  if (!disabled && hovered && frames.active !== undefined) frame = frames.active;
  if (!disabled && pressed && frames.down !== undefined) frame = frames.down;

  return (
    <MuSpriteFrame
      file={file}
      y={frame * height}
      width={width}
      height={height}
      style={{
        position: 'relative',
        pointerEvents: 'auto',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          // MU's buttons sink a pixel or two when held.
          paddingTop: pressed && !disabled ? 2 : 0,
          color: hovered && !disabled ? activeColor : color,
        }}
      >
        {label}
      </div>
    </MuSpriteFrame>
  );
};
