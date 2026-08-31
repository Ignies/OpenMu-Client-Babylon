import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  NOTICE_BACKGROUND,
  NOTICE_BLINK_MS,
  NOTICE_LINE_HEIGHT,
  NOTICE_STYLE,
  NOTICE_Y,
  Notices as NoticeStore,
} from '../../../common/notices';
import { MuText } from '../muText';
import { DEFAULT_SCALE } from '../muWindow/windowState';
import { UI_STAGE_HEIGHT } from '../uiStage';
import { stableKeyOf } from '../partyBars/stableKey';

/**
 * `RenderNotices`: the notice stack, centred, at y = 300 + 13·i of the
 * 640×480 layout. The text is drawn in screen pixels in the original; here
 * it takes the windows' default scale so it reads at the same size as the
 * rest of the interface.
 */

const SCALE = DEFAULT_SCALE;

const LINE_STYLE = { height: NOTICE_LINE_HEIGHT * SCALE };

function useBlink(active: boolean): boolean {
  const [dim, setDim] = useState(false);

  useEffect(() => {
    if (!active) {
      setDim(false);
      return;
    }
    const id = setInterval(() => setDim(d => !d), NOTICE_BLINK_MS);
    return () => clearInterval(id);
  }, [active]);

  return dim;
}

export const Notices = observer(() => {
  const lines = NoticeStore.lines;
  const anyBlinking = lines.some(line => NOTICE_STYLE[line.color]?.blink);
  const dim = useBlink(anyBlinking);

  if (lines.length === 0) return null;

  return (
    <div
      className="notices"
      style={{ top: `${(NOTICE_Y / UI_STAGE_HEIGHT) * 100}%` }}
    >
      {lines.map(line => {
        const style = NOTICE_STYLE[line.color] ?? NOTICE_STYLE[0];
        // The stack scrolls from the head: keyed by the line object, a
        // scroll moves nodes instead of re-propping every one of them.
        const key = stableKeyOf(line);
        if (line.text === '') {
          return <div key={key} className="notice-line" style={LINE_STYLE} />;
        }
        return (
          <div key={key} className="notice-line" style={LINE_STYLE}>
            <MuText
              face="bold"
              text={line.text}
              color={style.color}
              background={NOTICE_BACKGROUND}
              style={{
                opacity: style.blink && dim ? 128 / 255 : 1,
                transform: `scale(${SCALE})`,
                transformOrigin: 'center top',
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
