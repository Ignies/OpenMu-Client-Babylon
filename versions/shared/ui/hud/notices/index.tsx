import './style.less';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  NOTICE_BACKGROUND,
  NOTICE_BLINK_MS,
  NOTICE_LINE_HEIGHT,
  NOTICE_STYLE,
  NOTICE_Y,
  Notices as NoticeStore,
} from '@/modules/chat/notices';
import { MuText } from '@/controllers/interface/components/mu_text';
import { DEFAULT_SCALE } from '@/controllers/interface/windowManager';
import { UI_STAGE_HEIGHT } from '@/controllers/interface/components/ui_stage';
import { stableKeyOf } from '@/core/stableKey';
import { isOn } from '@/controllers/fidelity';
import { parseNoticeLinks } from '@/modules/chat/noticeLinks';

/**
 * `RenderNotices`: the notice stack, centred, at y = 300 + 13·i of the
 * 640×480 layout. The text is drawn in screen pixels in the original; here
 * it takes the windows' default scale so it reads at the same size as the
 * rest of the interface.
 */

const SCALE = DEFAULT_SCALE;

const LINE_STYLE = { height: NOTICE_LINE_HEIGHT * SCALE };

/** noticeLinks (ours): a notice's links, in a colour of their own. */
const LINK_COLOR = 'rgb(120,200,255)';

/** The line's text, its web addresses as links that open a new tab (one text run: same height as any line). */
const NoticeText = observer(({ text }: { text: string }) => {
  const segments = useMemo(() => parseNoticeLinks(text), [text]);
  return (
    <>
      {segments.map((s, i) => {
        const href = s.href;
        if (!href) return <span key={i}>{s.text}</span>;
        return (
          <span
            key={i}
            className="notice-link"
            style={{ color: LINK_COLOR }}
            onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
          >
            {s.text}
          </span>
        );
      })}
    </>
  );
});

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
  const links = isOn('noticeLinks');

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
              text={links ? undefined : line.text}
              color={style.color}
              background={NOTICE_BACKGROUND}
              style={{
                opacity: style.blink && dim ? 128 / 255 : 1,
                transform: `scale(${SCALE})`,
                transformOrigin: 'center top',
              }}
            >
              {links && <NoticeText text={line.text} />}
            </MuText>
          </div>
        );
      })}
    </div>
  );
});
