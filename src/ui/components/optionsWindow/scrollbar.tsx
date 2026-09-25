import { useEffect, useRef, useState, type RefObject } from 'react';
import { MuSpriteFrame } from '../muSprite';
import { MuWindows } from '../muWindow/windowState';

const BAR_WIDTH = 7;
const CAP = 3;
const THUMB_WIDTH = 15;
const THUMB_HEIGHT = 30;

/**
 * `CNewUIScrollBar`'s art beside a natively scrolling pane: the pane keeps
 * the wheel, touch and keyboard, the bar only draws where it is and takes a
 * drag. Thumb x follows the original, `x - (15/2 - 7/2)`.
 */
export const ScrollBar = ({
  target,
  windowId,
  left,
  top,
  height,
  contentKey,
}: {
  target: RefObject<HTMLElement>;
  /** The window's own CSS scale turns screen pixels into art pixels. */
  windowId: string;
  left: number;
  top: number;
  height: number;
  /** Changes whenever the pane is refilled, so the watch moves to the new rows. */
  contentKey: string;
}) => {
  const [view, setView] = useState({ ratio: 0, scrollable: false });
  const drag = useRef<{ pointerId: number; y: number; scrollTop: number } | null>(
    null
  );

  useEffect(() => {
    const pane = target.current;
    if (!pane) return;

    const update = () => {
      const room = pane.scrollHeight - pane.clientHeight;
      setView({
        ratio: room > 0 ? pane.scrollTop / room : 0,
        scrollable: room > 1,
      });
    };

    update();
    pane.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(pane);
    for (const child of Array.from(pane.children)) observer.observe(child);

    return () => {
      pane.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [target, contentKey]);

  const travel = height - THUMB_HEIGHT;
  const thumbTop = Math.round(travel * view.ratio);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const pane = target.current;
    if (!pane || !view.scrollable || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      scrollTop: pane.scrollTop,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pane = target.current;
    const from = drag.current;
    if (!pane || !from || from.pointerId !== event.pointerId || travel <= 0) {
      return;
    }

    const moved = (event.clientY - from.y) / MuWindows.scaleOf(windowId);
    const room = pane.scrollHeight - pane.clientHeight;
    pane.scrollTo({ top: from.scrollTop + (moved / travel) * room });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  /** A click on the track pages towards it, as the original does. */
  const onTrackDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const pane = target.current;
    if (!pane || !view.scrollable || event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scale = MuWindows.scaleOf(windowId);
    const y = (event.clientY - rect.top) / scale;
    const page = pane.clientHeight * 0.9;
    pane.scrollBy({
      top: y < thumbTop ? -page : y > thumbTop + THUMB_HEIGHT ? page : 0,
    });
    event.stopPropagation();
  };

  if (!view.scrollable) return null;

  return (
    <div
      className="options-scrollbar"
      data-no-drag="true"
      style={{ left, top, width: THUMB_WIDTH, height }}
      onPointerDown={onTrackDown}
    >
      <div
        style={{
          position: 'absolute',
          left: (THUMB_WIDTH - BAR_WIDTH) / 2,
          top: 0,
          width: BAR_WIDTH,
          height,
        }}
      >
        <MuSpriteFrame
          file="newui_scrollbar_up.OZT"
          width={BAR_WIDTH}
          height={CAP}
          style={{ position: 'absolute', top: 0 }}
        />
        <MuSpriteFrame
          file="newui_scrollbar_m.OZT"
          width={BAR_WIDTH}
          height={height - CAP * 2}
          style={{ position: 'absolute', top: CAP, backgroundRepeat: 'repeat-y' }}
        />
        <MuSpriteFrame
          file="newui_scrollbar_down.OZT"
          width={BAR_WIDTH}
          height={CAP}
          style={{ position: 'absolute', top: height - CAP }}
        />
      </div>
      <MuSpriteFrame
        file="newui_scroll_on.OZT"
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: thumbTop,
          cursor: 'pointer',
        }}
      >
        <div
          style={{ position: 'absolute', inset: 0 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </MuSpriteFrame>
    </div>
  );
};
