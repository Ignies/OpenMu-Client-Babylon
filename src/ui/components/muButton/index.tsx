import { useState, type CSSProperties } from 'react';
import { MuSpriteFrame } from '../muSprite';
import { uiClick } from '../../../libs/sfx';

export type MuButtonFrames = {
  up: number;
  active?: number;
  down?: number;
  check?: number;
};

type MuButtonProps = {
  file: string;
  width: number;
  height: number;
  frames: MuButtonFrames;
  label?: string;
  color?: string;
  activeColor?: string;
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  labelStyle?: CSSProperties;
  children?: React.ReactNode;
};

export const MuButton = ({
  file,
  width,
  height,
  frames,
  label,
  color = '#e2e2e2',
  activeColor = '#ffffff',
  checked = false,
  disabled = false,
  onClick,
  style,
  labelStyle,
  children,
}: MuButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  let frame = frames.up;

  if (checked && frames.check !== undefined) frame = frames.check;
  if (!disabled && hovered && frames.active !== undefined) frame = frames.active;
  if (!disabled && pressed && frames.down !== undefined) frame = frames.down;

  return (
    <MuSpriteFrame
      file={file}
      y={frame * height}
      width={width}
      height={height}
      // A button is never a drag handle. Without this the window's own
      // pointerdown starts a drag and captures the pointer, and the click
      // lands on the window root instead of here - the button looks alive and
      // does nothing. Every caller used to wrap itself in a `data-no-drag`
      // div to avoid that; the ones that forgot were simply broken.
      noDrag
      style={{
        position: 'relative',
        pointerEvents: 'auto',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onClick={disabled ? undefined : uiClick(onClick)}
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
          paddingTop: pressed && !disabled ? 2 : 0,
          color: hovered && !disabled ? activeColor : color,
          ...labelStyle,
        }}
      >
        {label}
        {children}
      </div>
    </MuSpriteFrame>
  );
};
