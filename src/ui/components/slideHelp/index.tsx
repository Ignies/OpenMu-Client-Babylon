import './style.less';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import {
  SlideHelp as SlideStore,
  type SlideLane,
  unpackSlideColor,
} from '../../../common/slideHelp';
import { GameOptions } from '../../../common/gameOptions';
import { MU_FONT_CLASS } from '../muText';
import { useUiStageScale } from '../uiStage';

/**
 * `CUISlideHelp::Render`: the marquee band at the top of the screen. The
 * lane state (position, speed, alpha) is simulated in `common/slideHelp.ts`
 * at the original's 25 Hz factors; this component only paints it, measures
 * the text width the simulation needs, and reports mouse hover (which
 * decelerates the scroll).
 *
 * The paint is not a React render: the clock below steps the simulation and
 * writes the per-frame values (position, alpha) straight into the lane's
 * elements through refs. React only renders a lane when its text changes.
 */

const TICKS_PER_SECOND = 25;
const MAX_FACTOR = 2;
/** `GetTextExtentPoint32(L"Z")`: Tahoma 11 px is 13 px tall. */
const FONT_HEIGHT = 13;

type LaneElements = {
  root: HTMLDivElement | null;
  band: HTMLDivElement | null;
  text: HTMLSpanElement | null;
};

/** The elements of each lane, for the painter. */
const laneElements = new Map<SlideLane, LaneElements>();

function paint(lane: SlideLane, scale: number): void {
  const els = laneElements.get(lane);
  if (!els?.root) return;

  // `visible` is `alphaRate > 0`; read outside a reaction, so untracked.
  const alpha = lane.alphaRate;
  if (alpha <= 0) {
    if (els.root.style.display !== 'none') els.root.style.display = 'none';
    return;
  }
  if (els.root.style.display !== '') els.root.style.display = '';

  const bandAlpha = Math.max(0, alpha - 25) / 255;
  const lineAlpha = (alpha > 180 ? alpha : Math.max(0, alpha - 25)) / 255;
  if (els.band) {
    els.band.style.background = `rgba(0,0,0,${bandAlpha.toFixed(3)})`;
    els.band.style.borderBottom = `${Math.max(1, scale)}px solid rgba(0,0,0,${lineAlpha.toFixed(3)})`;
  }

  if (els.text) {
    const color = unpackSlideColor(lane.color);
    const textAlpha = Math.min(
      1,
      (color.a / 255) *
        (((alpha > 180 ? alpha : Math.max(0, alpha - 25)) + 50) / 255)
    );
    els.text.style.left = `${lane.position * scale}px`;
    els.text.style.color = `rgba(${color.r},${color.g},${color.b},${textAlpha.toFixed(3)})`;
  }
}

function useSlideClock(scale: number): void {
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      const f = Math.min(MAX_FACTOR, dt * TICKS_PER_SECOND);
      runInAction(() => SlideStore.tick(f, dt, GameOptions.slideHelp));
      paint(SlideStore.notice, scaleRef.current);
      paint(SlideStore.help, scaleRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}

/**
 * One lane: renders when its text / colour / kind change, is painted by the
 * clock otherwise. Reads none of the per-frame fields (`position`,
 * `alphaRate`, `speed`, `visible`) so the simulation's writes do not reach
 * React.
 */
const Lane = observer(({ lane, scale }: { lane: SlideLane; scale: number }) => {
  const els = useRef<LaneElements>({ root: null, band: null, text: null });

  useEffect(() => {
    laneElements.set(lane, els.current);
    return () => {
      laneElements.delete(lane);
    };
  }, [lane]);

  const text = lane.text;
  const hasText = lane.hasText;

  // The simulation ends a slide once it has scrolled past its own width.
  useLayoutEffect(() => {
    const el = els.current.text;
    if (!el || !hasText) return;
    const width = el.getBoundingClientRect().width / scale;
    if (width !== lane.textWidth) {
      runInAction(() => {
        lane.textWidth = width;
      });
    }
    paint(lane, scale);
  }, [lane, text, hasText, scale]);

  const color = unpackSlideColor(lane.color);
  const bandHeight = (FONT_HEIGHT + 4) * scale;

  return (
    <div
      ref={el => (els.current.root = el)}
      className="slide-help-lane"
      style={{ height: bandHeight + 3 * scale, display: 'none' }}
      onMouseEnter={() => runInAction(() => (lane.hovered = true))}
      onMouseLeave={() => runInAction(() => (lane.hovered = false))}
    >
      <div
        ref={el => (els.current.band = el)}
        className="slide-help-band"
        style={{ top: 0, height: bandHeight }}
      />
      {hasText && (
        <span
          ref={el => (els.current.text = el)}
          className={`slide-help-text ${MU_FONT_CLASS[lane.kind === 'notice' ? 'bold' : 'normal']}`}
          style={{
            top: 2 * scale,
            color: `rgba(${color.r},${color.g},${color.b},0)`,
            transform: `scale(${scale})`,
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
});

export const SlideHelpBar = observer(() => {
  const scale = useUiStageScale();
  useSlideClock(scale);

  return (
    <div className="slide-help">
      <Lane lane={SlideStore.notice} scale={scale} />
      <Lane lane={SlideStore.help} scale={scale} />
    </div>
  );
});
