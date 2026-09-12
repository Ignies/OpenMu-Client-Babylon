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

/** Joins a candidate list into one dependency-stable key. */
const SEP = '|';

/** The first candidate already decoded, or null. */
function peekAny(names: readonly string[]): Sprite | null {
  for (const name of names) {
    const cached = peek(name);
    if (cached) return cached;
  }
  return null;
}

/**
 * The decoded sprite for `fileName`. A sprite the preloader already holds is
 * returned synchronously on the first render (no empty paint, no state
 * update), so the 100-odd squares of a grid mount without a hundred effects
 * firing `setState`.
 *
 * Several names are tried in order and the first that decodes wins, which is
 * how a picture that a language pack may or may not ship is asked for: the
 * pack's own art, then English. Same rule as `localDataCandidates` uses for
 * the tables, per file rather than per language.
 */
export function useMuSprite(
  fileName: string | readonly string[] | undefined
): Sprite | null {
  // Joined, so an inline array literal does not restart the load on every
  // render the way its identity would. No asset name holds a `|`.
  const key = typeof fileName === 'string' ? fileName : (fileName?.join(SEP) ?? '');

  const [sprite, setSprite] = useState<Sprite | null>(() =>
    key ? peekAny(key.split(SEP)) : null
  );

  useEffect(() => {
    if (!key) {
      setSprite(null);
      return;
    }

    const names = key.split(SEP);
    const cached = peekAny(names);
    if (cached) {
      setSprite(current => (current === cached ? current : cached));
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const [at, name] of names.entries()) {
        try {
          const loaded = await load(name);
          if (!cancelled) setSprite(loaded);
          return;
        } catch (err) {
          // Only the last one failing is news: the ones before it missing is
          // the fallback doing its job.
          if (at === names.length - 1) {
            console.error(`Could not load sprite ${name}:`, err);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

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
  /**
   * Marks the frame as something the window drag must not start on. The drag
   * takes a pointer capture on the window root (`useWindowChrome`), which
   * retargets the rest of the pointer sequence away from whatever was pressed
   * - so an interactive frame without this never sees its own click.
   */
  noDrag?: boolean;
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
  noDrag,
  children,
}: MuSpriteFrameProps) {
  const sprite = useMuSprite(file);

  return (
    <div
      className={className}
      title={title}
      onClick={onClick}
      data-no-drag={noDrag ? 'true' : undefined}
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
