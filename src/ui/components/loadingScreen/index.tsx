import './style.less';
import { observer } from 'mobx-react-lite';
import { Store, UIState } from '../../../store';
import { LoadingArt, useSheetSizes } from './art';
import { MuProgressBar } from './progressBar';

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
          <MuProgressBar
            progress={progress}
            width={PROGRESS_WIDTH * PROGRESS_SCALE}
            height={PROGRESS_HEIGHT * PROGRESS_SCALE}
          />
        </>
      )}
    </div>
  );
});
