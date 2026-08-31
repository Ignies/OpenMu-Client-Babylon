import './style.less';
import { observer } from 'mobx-react-lite';
import { Store, UIState } from '../../../store';
import { MuSpriteFrame } from '../muSprite';
import { LoadingArt, useSheetSizes } from './art';

const PROGRESS_WIDTH = 200;
const PROGRESS_HEIGHT = 16;
const PROGRESS_SCALE = 2;

export const LoadingScreen = observer(() => {
  const { contain, cover } = useSheetSizes();

  if (Store.uiState === UIState.Preloader) return null;

  if (!Store.isLoading) return null;

  const artReady = !Store.spritesLoading;

  const progress = Math.max(0, Math.min(1, Store.loadingProgress));

  return (
    <div className="loading-screen">
      {artReady && (
        <>
          <LoadingArt size={cover} className="loading-art loading-art-blur" />
          <LoadingArt size={contain} className="loading-art" />

          {}
          <div className="loading-bar-wrap">
            {}
            <div
              className="loading-bar-glow"
              style={{
                width: PROGRESS_WIDTH * PROGRESS_SCALE,
                height: PROGRESS_HEIGHT * PROGRESS_SCALE,
              }}
            >
              <div
                className="loading-bar-glow-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div
              className="loading-bar"
              style={{
                width: PROGRESS_WIDTH * PROGRESS_SCALE,
                height: PROGRESS_HEIGHT * PROGRESS_SCALE,
              }}
            >
              {}
              <MuSpriteFrame
                file="Progress_Back.OZJ"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundSize: '100% 100%',
                }}
              />

              {}
              <div
                className="loading-bar-fill"
                style={{ width: `${progress * 100}%` }}
              >
                <MuSpriteFrame
                  file="Progress.OZJ"
                  width={PROGRESS_WIDTH * PROGRESS_SCALE}
                  height={PROGRESS_HEIGHT * PROGRESS_SCALE}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    backgroundSize: '100% 100%',
                  }}
                />
                {}
                <div className="loading-bar-shimmer" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
