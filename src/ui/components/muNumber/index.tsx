import type { CSSProperties } from 'react';
import { useMuSprite } from '../muSprite';

const NUMBER_FILE = 'newui_number1.OZT';

const GLYPH_COUNT = 10;

function glyphSize(scale: number) {
  return { width: 12 * (scale - 0.3), height: 16 * (scale - 0.3) };
}

const ADVANCE_RATIO = 0.8;

type MuNumberProps = {
  value: number;
  x: number;
  y: number;
  scale?: number;
  className?: string;
  style?: CSSProperties;
};

export const MuNumber = ({
  value,
  x,
  y,
  scale = 1,
  className,
  style,
}: MuNumberProps) => {
  const sprite = useMuSprite(NUMBER_FILE);

  if (scale < 0.3) return null;

  const { width, height } = glyphSize(scale);
  const digits = String(Math.trunc(value));
  const advance = width * ADVANCE_RATIO;

  const backgroundSize = `${GLYPH_COUNT * width}px ${height}px`;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: x - (width * digits.length) / 2,
        top: y,
        height,
        ...style,
      }}
    >
      {sprite &&
        [...digits].map((digit, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: i * advance,
              top: 0,
              width,
              height,
              backgroundImage: `url(${sprite.url})`,
              backgroundSize,
              backgroundPosition: `${-Number(digit) * width}px 0`,
              backgroundRepeat: 'no-repeat',
              imageRendering: 'auto',
            }}
          />
        ))}
    </div>
  );
};
