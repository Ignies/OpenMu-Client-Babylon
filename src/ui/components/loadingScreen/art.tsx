import './style.less';
import { useEffect, useState, type CSSProperties } from 'react';
import { MuSpriteFrame } from '../muSprite';

/**
 * The loading artwork itself — `LSBg01..04`, the four 400×300 quarters of the
 * 800×600 sheet the original draws while a map loads.
 *
 * Split out of the loading screen because two places want the picture and only
 * one wants the screen: the loading screen covers everything opaquely, while
 * the start menu uses the same art as its own backdrop until the 3D login
 * scene behind it is ready.
 */

const SHEET_ASPECT = 800 / 600;

const TILE_WIDTH = '50%';
const TALL_HEIGHT = `${(512 / 600) * 100}%`;
const SHORT_HEIGHT = `${(88 / 600) * 100}%`;

export type ArtSize = { width: number; height: number };

/**
 * The sheet sized two ways for the current window: `contain` is the whole
 * picture, `cover` fills the window for the blurred copy behind it.
 */
export function useSheetSizes(): { contain: ArtSize; cover: ArtSize } {
  const measure = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wide = vw / vh > SHEET_ASPECT;

    return {
      contain: wide
        ? { width: vh * SHEET_ASPECT, height: vh }
        : { width: vw, height: vw / SHEET_ASPECT },
      cover: wide
        ? { width: vw, height: vw / SHEET_ASPECT }
        : { width: vh * SHEET_ASPECT, height: vh },
    };
  };

  const [sizes, setSizes] = useState(measure);

  useEffect(() => {
    const onResize = () => setSizes(measure());

    window.addEventListener('resize', onResize);
    onResize();

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return sizes;
}

const tile = (left: string, top: string, height: string): CSSProperties => ({
  position: 'absolute',
  left,
  top,
  width: TILE_WIDTH,
  height,
  backgroundSize: '100% 100%',
});

export const LoadingArt = ({
  size,
  className,
}: {
  size: ArtSize;
  className?: string;
}) => (
  <div className={className} style={size}>
    <MuSpriteFrame file="LSBg01.OZJ" style={tile('0', '0', TALL_HEIGHT)} />
    <MuSpriteFrame file="LSBg02.OZJ" style={tile('50%', '0', TALL_HEIGHT)} />
    <MuSpriteFrame file="LSBg03.OZJ" style={tile('0', TALL_HEIGHT, SHORT_HEIGHT)} />
    <MuSpriteFrame
      file="LSBg04.OZJ"
      style={tile('50%', TALL_HEIGHT, SHORT_HEIGHT)}
    />
  </div>
);
