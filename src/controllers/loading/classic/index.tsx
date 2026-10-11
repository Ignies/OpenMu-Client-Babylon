import './style.less';
import { observer } from 'mobx-react-lite';
import { Loading } from '../loadingState';
import { LoadingArt, useSheetSizes } from './art';
import { MuProgressBar } from './progressBar';

const PROGRESS_WIDTH = 200;
const PROGRESS_HEIGHT = 16;
const PROGRESS_SCALE = 2;

/** `hidden`: read in render, true while the app shows a page that draws its own progress (the preloader). */
export const LoadingScreen = observer(({ hidden }: { hidden: () => boolean }) => {
  const { contain, cover } = useSheetSizes();

  if (hidden()) return null;

  if (!Loading.isLoading) return null;

  const artReady = !Loading.spritesLoading;

  const progress = Math.max(0, Math.min(1, Loading.loadingProgress));

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
