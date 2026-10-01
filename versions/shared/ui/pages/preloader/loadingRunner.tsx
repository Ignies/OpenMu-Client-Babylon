import { useRef } from 'react';
import { LightningBar } from './lightningBar';

const PART = (name: string) => `/ui/world_select/runner_${name}.webp`;

/**
 * The background load as a bar with a hunter running along it, the way
 * Monster Hunter shows a load. The hunter is a three-bone rig - the body, and
 * a leg on each hip - driven by the `ws-run-*` keyframes in `style.less`,
 * which were solved offline so the lower foot always stands on the bar. The
 * fill under him is red lightning (`lightningBar.tsx`).
 *
 * Done, the hunter runs off the end; the page then opens the full bar out
 * into the worlds card.
 */
export const LoadingRunner = ({
  progress,
  done,
  label,
}: {
  progress: number;
  done: boolean;
  /** What is loading and how far, under the bar. */
  label: string;
}) => {
  // Never backwards: two loads reporting in turn must not pull the runner back.
  const peak = useRef(0);
  peak.current = Math.max(peak.current, Math.min(1, Math.max(0, progress)));
  const at = done ? 1 : peak.current;
  const runner = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`ws-loader${done ? ' is-done' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(at * 100)}
    >
      <div className="ws-loader-track">
        <div className="ws-loader-fill" style={{ width: `${at * 100}%` }} />
      </div>
      <LightningBar runner={runner} />
      <div ref={runner} className="ws-runner" style={{ left: `${at * 100}%` }}>
        <span className="ws-runner-dust">
          <i />
          <i />
        </span>
        <span className="ws-runner-rig">
          <img
            className="ws-runner-part ws-runner-left"
            src={PART('left_leg')}
            alt=""
            draggable={false}
          />
          <img
            className="ws-runner-part ws-runner-right"
            src={PART('right_leg')}
            alt=""
            draggable={false}
          />
          <img
            className="ws-runner-part ws-runner-body"
            src={PART('body')}
            alt=""
            draggable={false}
          />
        </span>
      </div>
      <p className="ws-loader-label ws-mono">{label}</p>
    </div>
  );
};
