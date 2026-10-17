import './style.less';
import { MuSpriteFrame } from '../../interface/components/mu_sprite';

/**
 * The loading screen's progress bar.
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
  const ratio = Math.max(0, Math.min(1, progress || 0));
  // Moved by transforms, which keep animating while a map load holds the main thread: the fill
  // window slides in from the left and its art slides back the same amount, so the art stays put.
  const hidden = `${(1 - ratio) * 100}%`;

  return (
    <div className="loading-bar-wrap" style={{ position: 'relative' }}>
      <div className="loading-bar-glow" style={{ width, height }}>
        <div className="loading-bar-glow-fill" style={{ transform: `scaleX(${ratio})` }} />
      </div>

      <div className="loading-bar" style={{ width, height }}>
        <MuSpriteFrame
          file="Progress_Back.OZJ"
          style={{ position: 'absolute', inset: 0, backgroundSize: '100% 100%' }}
        />

        <div className="loading-bar-fill" style={{ transform: `translateX(-${hidden})` }}>
          <MuSpriteFrame
            file="Progress.OZJ"
            width={width}
            height={height}
            className="loading-bar-art"
            style={{ position: 'absolute', left: 0, top: 0, backgroundSize: '100% 100%', transform: `translateX(${hidden})` }}
          />
          <div className="loading-bar-shimmer" />
        </div>
      </div>
    </div>
  );
}
