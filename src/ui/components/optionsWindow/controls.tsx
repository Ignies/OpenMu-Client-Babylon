import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
import { uiClick } from '../../../libs/sfx';

/**
 * One line of text squeezed sideways until it fits its box. A translated
 * label on fixed art (a button, a plate, a nav entry) has nowhere to wrap to,
 * and a clipped or overflowing word is worse than a slightly narrow one.
 */
export const FitText = ({
  children,
  className,
  style,
  align = 'center',
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  align?: 'left' | 'center';
}) => {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [squeeze, setSqueeze] = useState(1);

  useLayoutEffect(() => {
    const outer = box.current;
    const text = inner.current;
    if (!outer || !text) return;

    const room = outer.clientWidth;
    const need = text.scrollWidth;
    const next = need > room && need > 0 ? room / need : 1;
    setSqueeze(current => (Math.abs(current - next) < 0.01 ? current : next));
  }, [children]);

  return (
    <span
      ref={box}
      className={className}
      style={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        minWidth: 0,
        ...style,
      }}
    >
      <span
        ref={inner}
        style={{
          display: 'inline-block',
          transform: squeeze < 1 ? `scaleX(${squeeze})` : undefined,
          transformOrigin: align === 'center' ? 'center' : 'left center',
        }}
      >
        {children}
      </span>
    </span>
  );
};

const BUTTON_ART = 'op1_b_all.OZT';
const BUTTON_ART_WIDTH = 108;
const BUTTON_HEIGHT = 30;
const BUTTON_FRAMES = 4;

/**
 * `op1_b_all` at any width: the art is scaled sideways, not cropped, so the
 * bevel reaches both ends. Frame 3 is the lit gold one.
 */
export const OptionsButton = ({
  label,
  width = BUTTON_ART_WIDTH,
  onClick,
  disabled,
  checked,
  style,
  onHover,
}: {
  label: string;
  width?: number;
  onClick: () => void;
  disabled?: boolean;
  checked?: boolean;
  style?: CSSProperties;
  onHover?: () => void;
}) => (
  <div
    style={{ position: 'absolute', width, height: BUTTON_HEIGHT, ...style }}
    onPointerEnter={onHover}
  >
    <MuButton
      file={BUTTON_ART}
      width={width}
      height={BUTTON_HEIGHT}
      frames={{ up: 0, active: 1, down: 2, check: 3 }}
      checked={checked}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      disabled={disabled}
      onClick={onClick}
      style={{
        backgroundSize: `${width}px ${BUTTON_HEIGHT * BUTTON_FRAMES}px`,
      }}
      labelStyle={{
        fontSize: 11,
        textShadow: '1px 1px 0 rgba(0,0,0,.85)',
        padding: '0 8px',
      }}
    >
      <FitText style={{ width: '100%' }}>{label}</FitText>
    </MuButton>
  </div>
);

const CHECK_SIZE = 16;

/** `op2_ch`: frame 0 is the empty box, frame 1 the orange tick. */
export const Checkbox = ({ checked }: { checked: boolean }) => (
  <MuSpriteFrame
    file="op2_ch.OZT"
    y={checked ? CHECK_SIZE : 0}
    width={CHECK_SIZE}
    height={CHECK_SIZE}
    style={{ flex: 'none' }}
  />
);

const TRACK_WIDTH = 98;
const TRACK_HEIGHT = 13;
const THUMB_SIZE = 13;
const GAUGE_INSET_X = 3;
const GAUGE_INSET_Y = 3;
const GAUGE_WIDTH = 95 - GAUGE_INSET_X;
const GAUGE_HEIGHT = 10 - GAUGE_INSET_Y;

/**
 * The original volume gauge (`op2_volume1/2/3`) over an invisible range
 * input, which does the dragging and the keyboard. The input lets go of the
 * focus when the pointer does: a focused input counts as typing, and every
 * hot key (Escape included) would be swallowed until the player clicked
 * somewhere else.
 */
export const Slider = ({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) => {
  const span = max - min;
  const ratio = span === 0 ? 0 : (value - min) / span;

  return (
    <div
      className="options-slider"
      style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      data-no-drag="true"
    >
      <MuSpriteFrame
        file="op2_volume1.OZT"
        width={TRACK_WIDTH}
        height={TRACK_HEIGHT}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <MuSpriteFrame
        file="op2_volume2.OZJ"
        width={Math.round(GAUGE_WIDTH * ratio)}
        height={GAUGE_HEIGHT}
        style={{
          position: 'absolute',
          left: GAUGE_INSET_X,
          top: GAUGE_INSET_Y,
          backgroundRepeat: 'repeat',
        }}
      />
      <MuSpriteFrame
        file="op2_volume3.OZT"
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        style={{
          position: 'absolute',
          left: Math.round((TRACK_WIDTH - THUMB_SIZE) * ratio),
          top: 0,
          pointerEvents: 'none',
        }}
      />
      <input
        type="range"
        className="options-range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        onPointerUp={e => e.currentTarget.blur()}
        onKeyUp={e => {
          if (e.key === 'Escape') e.currentTarget.blur();
        }}
      />
    </div>
  );
};

const ARROW_WIDTH = 17;
const ARROW_HEIGHT = 12;

/**
 * A mode picked by name: the quest window's gold page arrows either side of
 * a plate. The arrows stop at the ends; the plate itself steps round, so a
 * two-way choice is one click.
 */
export const Stepper = ({
  value,
  min,
  max,
  text,
  disabled,
  width,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  text: string;
  disabled: boolean;
  width: number;
  onChange: (value: number) => void;
}) => {
  const arrow = (side: 'L' | 'R', next: number, enabled: boolean) => (
    <MuButton
      file={`Quest_bt_${side}.OZT`}
      width={ARROW_WIDTH}
      height={ARROW_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      disabled={disabled || !enabled}
      onClick={() => onChange(next)}
      style={{ flex: 'none', opacity: disabled || enabled ? 1 : 0.35 }}
    />
  );

  return (
    <div className="options-stepper" style={{ width }}>
      {arrow('L', value - 1, value > min)}
      <div
        className="options-plate options-stepper-value"
        data-no-drag="true"
        onClick={
          disabled
            ? undefined
            : uiClick(() => onChange(value >= max ? min : value + 1))
        }
      >
        <FitText style={{ width: '100%' }}>{text}</FitText>
      </div>
      {arrow('R', value + 1, value < max)}
    </div>
  );
};
