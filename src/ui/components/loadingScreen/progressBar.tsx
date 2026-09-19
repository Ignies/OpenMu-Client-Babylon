import './style.less';
import { MuSpriteFrame } from '../muSprite';

/**
 * The game's progress bar, on its own so the loading screen and the
 * pre-download screen are the same bar rather than two that drift apart.
 *
 * Four layers, and the order matters: a blurred glow behind, the
 * `Progress_Back.OZJ` trough, the `Progress.OZJ` fill clipped to the ratio
 * and blended `screen` (the art is a gold line on black, and screen is what
 * makes the black vanish), then the shimmer.
 */
export function MuProgressBar({
  progress,
  width,
  height,
}: {
  /** 0..1; clamped here so a caller cannot overrun the trough. */
  progress: number;
  width: number;
  height: number;
}) {
  const ratio = Math.max(0, Math.min(1, progress));
  const percent = `${ratio * 100}%`;

  return (
    <div className="loading-bar-wrap" style={{ position: 'relative' }}>
      <div className="loading-bar-glow" style={{ width, height }}>
        <div className="loading-bar-glow-fill" style={{ width: percent }} />
      </div>

      <div className="loading-bar" style={{ width, height }}>
        <MuSpriteFrame
          file="Progress_Back.OZJ"
          style={{ position: 'absolute', inset: 0, backgroundSize: '100% 100%' }}
        />

        <div className="loading-bar-fill" style={{ width: percent }}>
          <MuSpriteFrame
            file="Progress.OZJ"
            width={width}
            height={height}
            style={{ position: 'absolute', left: 0, top: 0, backgroundSize: '100% 100%' }}
          />
          <div className="loading-bar-shimmer" />
        </div>
      </div>
    </div>
  );
}
