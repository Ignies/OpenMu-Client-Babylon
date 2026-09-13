import type { CSSProperties, ReactNode } from 'react';
import { MuSpriteFrame } from '../../components/muSprite';
import {
  BOTTOM_PLAIN_END,
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

/**
 * One band of the frame: the art, and the same art mirrored beside it.
 *
 * Given a `plainEnd`, the band is closed across the middle instead. The mirror
 * puts the figure at the art's inner end against its own reflection, which
 * reads as a join in the frame rather than as decoration - so each half stops
 * where the art is still a plain edge and a slice of that edge bridges what is
 * left, cut from the columns just inside the figure. What closes the band is
 * the band.
 */
const Band = ({
  file,
  height,
  plainEnd = SETUP_ART_WIDTH,
  edge,
}: {
  file: string;
  height: number;
  plainEnd?: number;
  /** Which way up this band hangs. */
  edge: 'top' | 'bottom';
}) => {
  const bridge = SETUP_WIN_WIDTH - plainEnd * 2;

  return (
    <>
      {[false, true].map(mirrored => (
        <MuSpriteFrame
          key={`${edge}-${mirrored}`}
          file={file}
          width={plainEnd}
          height={height}
          style={{
            position: 'absolute',
            left: mirrored ? SETUP_WIN_WIDTH - plainEnd : 0,
            [edge]: 0,
            ...(mirrored && { transform: 'scaleX(-1)' }),
          }}
        />
      ))}
      {bridge > 0 && (
        <MuSpriteFrame
          file={file}
          x={plainEnd - bridge}
          width={bridge}
          height={height}
          style={{ position: 'absolute', left: plainEnd, [edge]: 0 }}
        />
      )}
    </>
  );
};

/** Stone fill, side rails, and the top and bottom bands. */
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
    <Band file={SPRITE.optionTop} height={SETUP_TOP_HEIGHT} edge="top" />
    <Band
      file={SPRITE.optionBottom}
      height={SETUP_BOTTOM_HEIGHT}
      plainEnd={BOTTOM_PLAIN_END}
      edge="bottom"
    />
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
