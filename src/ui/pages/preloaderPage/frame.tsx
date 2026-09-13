import type { CSSProperties, ReactNode } from 'react';
import { MuSpriteFrame } from '../../components/muSprite';
import {
  FIELD_HEIGHT,
  FIELD_LABEL_H,
  FIELD_WIDTH,
  FIELD_X,
  SETUP_ART_WIDTH,
  SETUP_BOTTOM_HEIGHT,
  SETUP_TOP_HEIGHT,
  SETUP_WIN_WIDTH,
  SPRITE,
} from './layout';

/**
 * The Option window's frame at whatever height it is asked for, and the sunken
 * plate MU puts under a text field. Both used to be copied into each screen
 * that wanted them; they are here so the server window's tabs share one frame
 * rather than each drawing their own slightly different one.
 */

/** Stone fill, side rails, and the mirrored top and bottom bands. */
export const SetupFrame = ({ height }: { height: number }) => (
  <>
    <MuSpriteFrame
      file={SPRITE.optionFill}
      width={SETUP_WIN_WIDTH - 6}
      height={height - 6}
      style={{
        position: 'absolute',
        left: 3,
        top: 3,
        backgroundRepeat: 'repeat',
      }}
    />
    <MuSpriteFrame
      file={SPRITE.optionRailLeft}
      width={5}
      height={height - SETUP_TOP_HEIGHT - SETUP_BOTTOM_HEIGHT}
      style={{
        position: 'absolute',
        left: 0,
        top: SETUP_TOP_HEIGHT,
        backgroundRepeat: 'repeat-y',
      }}
    />
    <MuSpriteFrame
      file={SPRITE.optionRailRight}
      width={5}
      height={height - SETUP_TOP_HEIGHT - SETUP_BOTTOM_HEIGHT}
      style={{
        position: 'absolute',
        right: 0,
        top: SETUP_TOP_HEIGHT,
        backgroundRepeat: 'repeat-y',
      }}
    />
    {[false, true].map(mirrored => (
      <MuSpriteFrame
        key={`top-${mirrored}`}
        file={SPRITE.optionTop}
        width={SETUP_ART_WIDTH}
        height={SETUP_TOP_HEIGHT}
        style={{
          position: 'absolute',
          left: mirrored ? SETUP_ART_WIDTH : 0,
          top: 0,
          ...(mirrored && { transform: 'scaleX(-1)' }),
        }}
      />
    ))}
    {[false, true].map(mirrored => (
      <MuSpriteFrame
        key={`bottom-${mirrored}`}
        file={SPRITE.optionBottom}
        width={SETUP_ART_WIDTH}
        height={SETUP_BOTTOM_HEIGHT}
        style={{
          position: 'absolute',
          left: mirrored ? SETUP_ART_WIDTH : 0,
          bottom: 0,
          ...(mirrored && { transform: 'scaleX(-1)' }),
        }}
      />
    ))}
  </>
);

/** The plate on its own, for a field that writes its own label (or none). */
export const Plate = ({
  width,
  height = FIELD_HEIGHT,
  left,
  top,
  children,
  style,
}: {
  width: number;
  height?: number;
  left: number;
  top: number;
  children?: ReactNode;
  style?: CSSProperties;
}) => (
  <MuSpriteFrame
    file={SPRITE.input}
    width={width}
    height={height}
    style={{
      position: 'absolute',
      left,
      top,
      // The plate art is 156×23; stretching rather than cropping is what lets
      // one piece of art back a 300px search box and a 70px port field alike.
      backgroundSize: '100% 100%',
      ...style,
    }}
  >
    {children}
  </MuSpriteFrame>
);

export type FieldProps = {
  label: string;
  value: string;
  width?: number;
  top: number;
  left?: number;
  disabled?: boolean;
  numeric?: boolean;
  password?: boolean;
  maxLength?: number;
  placeholder?: string;
  onChange: (value: string) => void;
};

/** A labelled field: the label, then the plate, then the input on top of it. */
export const Field = ({
  label,
  value,
  width = FIELD_WIDTH,
  top,
  left = FIELD_X,
  disabled,
  numeric,
  password,
  maxLength,
  placeholder,
  onChange,
}: FieldProps) => (
  <>
    <span className="setup-label" style={{ left, top }}>
      {label}
    </span>
    <Plate width={width} left={left} top={top + FIELD_LABEL_H}>
      <input
        className="setup-input"
        type={password ? 'password' : numeric ? 'number' : 'text'}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
      />
    </Plate>
  </>
);
