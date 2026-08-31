import React, { memo, useEffect, useState, type CSSProperties } from 'react';
import {
  loadInterfaceSprite,
  loadMuSprite,
  peekInterfaceSprite,
  peekMuSprite,
  type MuSprite as Sprite,
} from '../../../libs/mu/sprites';

// A `Data/`-rooted name (`Data/Logo/MU-logo.OZT`) is loaded from Data as-is; anything
// else (bare or with a subfolder, `partCharge1/newui_menu03.OZJ`) is an Interface sprite.
const DATA_PREFIX = 'Data/';

function peek(fileName: string): Sprite | null {
  return fileName.startsWith(DATA_PREFIX)
    ? peekMuSprite(fileName.slice(DATA_PREFIX.length))
    : peekInterfaceSprite(fileName);
}

function load(fileName: string): Promise<Sprite> {
  return fileName.startsWith(DATA_PREFIX)
    ? loadMuSprite(fileName.slice(DATA_PREFIX.length))
    : loadInterfaceSprite(fileName);
}

/**
 * The decoded sprite for `fileName`. A sprite the preloader already holds is
 * returned synchronously on the first render (no empty paint, no state
 * update), so the 100-odd squares of a grid mount without a hundred effects
 * firing `setState`.
 */
export function useMuSprite(fileName: string | undefined): Sprite | null {
  const [sprite, setSprite] = useState<Sprite | null>(() =>
    fileName ? peek(fileName) : null
  );

  useEffect(() => {
    if (!fileName) {
      setSprite(null);
      return;
    }

    const cached = peek(fileName);
    if (cached) {
      setSprite(current => (current === cached ? current : cached));
      return;
    }

    let cancelled = false;

    load(fileName).then(
      loaded => {
        if (!cancelled) setSprite(loaded);
      },
      err => console.error(`Could not load sprite ${fileName}:`, err)
    );

    return () => {
      cancelled = true;
    };
  }, [fileName]);

  return sprite;
}

type MuSpriteFrameProps = {
  file: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

/**
 * A crop of a sprite sheet as a `div` background. Memoised: a grid draws
 * 60–120 of these and only the hovered one changes between renders, so
 * callers should hoist their `style` objects where they can (a fresh object
 * literal defeats the memo for that frame).
 */
export const MuSpriteFrame = memo(function MuSpriteFrame({
  file,
  x = 0,
  y = 0,
  width,
  height,
  className,
  style,
  title,
  onClick,
  children,
}: MuSpriteFrameProps) {
  const sprite = useMuSprite(file);

  return (
    <div
      className={className}
      title={title}
      onClick={onClick}
      style={{
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        backgroundImage: sprite ? `url(${sprite.url})` : undefined,
        backgroundPosition: `-${x}px -${y}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      {children}
    </div>
  );
});

type MuSpriteProps = {
  file: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  scale?: number;
};

export const MuSprite = memo(function MuSprite({
  file,
  alt = '',
  className,
  style,
  scale = 1,
}: MuSpriteProps) {
  const sprite = useMuSprite(file);

  if (!sprite) return null;

  return (
    <img
      src={sprite.url}
      alt={alt}
      className={className}
      width={sprite.width * scale}
      height={sprite.height * scale}
      style={{ imageRendering: 'pixelated', ...style }}
    />
  );
});
