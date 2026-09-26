import type { CSSProperties } from 'react';
import { MuSpriteFrame, useMuSprite } from '../muSprite';

export const TOP_HEIGHT = 65;
export const BOTTOM_HEIGHT = 43;
const RAIL_WIDTH = 5;

/**
 * A band of window art stretched to any width by keeping its two ends and
 * tiling a plain run of the middle, so the ornaments stay whole and nothing
 * meets in the middle. `op2_back1` and `op1_back2` are complete bands with a
 * corner figure at each end; the options window is wider than one of them.
 */
export const SlicedBand = ({
  file,
  width,
  height,
  left,
  right,
  style,
}: {
  file: string;
  width: number;
  height: number;
  /** Columns kept whole at each end; the run between them tiles. */
  left: number;
  right: number;
  style?: CSSProperties;
}) => {
  const sprite = useMuSprite(file);

  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        boxSizing: 'border-box',
        borderStyle: 'solid',
        borderWidth: `0 ${right}px 0 ${left}px`,
        borderColor: 'transparent',
        borderImage: sprite
          ? `url(${sprite.url}) 0 ${right} 0 ${left} fill / 0 ${right}px 0 ${left}px repeat`
          : undefined,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

/** The option window's own art at any size: stone, rails, title bar, foot. */
export const OptionsFrame = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => (
  <>
    <MuSpriteFrame
      file="op1_stone.OZJ"
      width={width - 6}
      height={height - 6}
      style={{ position: 'absolute', left: 3, top: 3, backgroundRepeat: 'repeat' }}
    />
    {(['left', 'right'] as const).map(side => (
      <MuSpriteFrame
        key={side}
        file={side === 'left' ? 'op1_back3.OZJ' : 'op1_back4.OZJ'}
        width={RAIL_WIDTH}
        height={height - TOP_HEIGHT - BOTTOM_HEIGHT}
        style={{
          position: 'absolute',
          [side]: 0,
          top: TOP_HEIGHT,
          backgroundRepeat: 'repeat-y',
        }}
      />
    ))}
    {/* The plain run of the title bar is x 80..130; the foot's rule 60..150. */}
    <SlicedBand
      file="op2_back1.OZT"
      width={width}
      height={TOP_HEIGHT}
      left={80}
      right={83}
      style={{ left: 0, top: 0 }}
    />
    <SlicedBand
      file="op1_back2.OZT"
      width={width}
      height={BOTTOM_HEIGHT}
      left={60}
      right={63}
      style={{ left: 0, bottom: 0 }}
    />
  </>
);
