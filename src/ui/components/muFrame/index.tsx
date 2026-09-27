import './style.less';
import type { CSSProperties } from 'react';
import { MuSpriteFrame, useMuSprite } from '../muSprite';

/**
 * MU's Option window frame around a panel, at twice its size: the lower band
 * of that window (`op1_back2`, rails and curls on both ends, a silver bar
 * between) along the bottom and flipped along the top, and its side rails
 * (`op1_back3` / `op1_back4`) tiled down between them.
 */
const BAND = 'op1_back2.OZT';
const RAIL_LEFT = 'op1_back3.OZJ';
const RAIL_RIGHT = 'op1_back4.OZJ';

/** The band's two ends, and the plain run of bar between them. */
const END = { width: 50, height: 43 };
const RIGHT_END_X = 163;
const BAR = { x: 60, width: 90, sheet: 213 };

/** The bar slice stretched to whatever width is left between the ends. */
function barStyle(url: string | undefined): CSSProperties {
  return {
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `calc(100% * ${BAR.sheet} / ${BAR.width}) 100%`,
    // A percentage position aligns rather than offsets: this puts x = 60 of
    // the sheet on the left edge once the sheet is stretched as above.
    backgroundPositionX: `${((BAR.x / (BAR.sheet - BAR.width)) * 100).toFixed(3)}%`,
    imageRendering: 'pixelated',
  };
}

function railStyle(url: string | undefined): CSSProperties {
  return {
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundRepeat: 'repeat-y',
    backgroundSize: '10px 16px',
    imageRendering: 'pixelated',
  };
}

export const MuFrame = () => {
  const band = useMuSprite(BAND);
  const left = useMuSprite(RAIL_LEFT);
  const right = useMuSprite(RAIL_RIGHT);

  return (
    <div className="mu-frame" aria-hidden>
      <div
        className="mu-frame-rail mu-frame-rail-left"
        style={railStyle(left?.url)}
      />
      <div
        className="mu-frame-rail mu-frame-rail-right"
        style={railStyle(right?.url)}
      />
      <div className="mu-frame-bar mu-frame-bar-top" style={barStyle(band?.url)} />
      <div className="mu-frame-bar mu-frame-bar-bottom" style={barStyle(band?.url)} />
      {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
        <div key={corner} className={`mu-frame-end mu-frame-${corner}`}>
          <MuSpriteFrame
            file={BAND}
            x={corner.endsWith('r') ? RIGHT_END_X : 0}
            width={END.width}
            height={END.height}
          />
        </div>
      ))}
    </div>
  );
};
