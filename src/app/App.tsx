import { t } from '../i18n';
import { ServersPage } from '@versions/shared/ui/pages/server_select';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { addNotification } from '../modules/chat';
import { AppState, UIState } from '../controllers/interface/uiState';
import { loadVersionUi } from '../version';
import { WorldPage } from '@versions/shared/ui/pages/world';
import { useEventBus } from '@/controllers/interface/hooks';
import { DirectLoadPage, PreloaderPage } from '@versions/shared/ui/pages/preloader';
import { DirectLogin } from '../modules/servers/directLogin';
import { playOffline } from './offline';
import { LoadingScreen } from '../controllers/loading/classic';
import { WarpFade } from '../controllers/loading/fade';
import { Loading } from '../controllers/loading';
import { OptionsWindow } from '@versions/shared/ui/windows/options';
import { PregameSystemMenu } from '@versions/shared/ui/windows/system_menu/pregame';
import { CreditsWindow } from '@versions/shared/ui/windows/credits';
import { ProjectCreditsWindow } from '@versions/shared/ui/windows/project_credits';
import { GameCursor } from '../controllers/interface/components/game_cursor';
import { ReconnectOverlay } from '@versions/shared/ui/components/reconnect_overlay';
import { AutoDownload } from '@versions/shared/ui/components/auto_download';

// The login and character screens are the version's own: Season 6 draws its
// two windows over a login world, 0.97d draws period chrome over a ship at
// sea. `Suspense fallback={null}` shows the backdrop for the frame the chunk
// takes to arrive, which is what it shows anyway while its sprites decode.
const LoginPage = lazy(() =>
  loadVersionUi().then(ui => ({ default: ui.pregame.LoginPage }))
);

const CharactersPage = lazy(() =>
  loadVersionUi().then(ui => ({ default: ui.pregame.CharactersPage }))
);

const CurrentPage = observer(() => {
  const state = AppState.uiState;

  switch (state) {
    case UIState.Preloader:
      // `?direct`: a full-download screen, then the server select, where lighter assets are on (`directLoad.tsx`).
      return DirectLogin.auto ? (
        <DirectLoadPage fallback={<PreloaderPage onPlayOffline={playOffline} />} />
      ) : (
        <PreloaderPage onPlayOffline={playOffline} />
      );
    case UIState.Servers:
      return <ServersPage />;
    case UIState.Login:
      return (
        <Suspense fallback={null}>
          <LoginPage />
        </Suspense>
      );
    case UIState.Characters:
      return (
        <Suspense fallback={null}>
          <CharactersPage />
        </Suspense>
      );
    case UIState.LoadingWorld:
    case UIState.World:
      return <WorldPage />;
    default:
      return <div>No Page</div>;
  }
});

const onPreloader = () => AppState.uiState === UIState.Preloader;
/** The classic art steps aside for a warp from inside the world that `WarpFade` covers (`warpFade`). */
const hideClassic = () => onPreloader() || Loading.inWorldWarp;

export const App = observer(() => {
  useEventBus('wsError', () => {
    addNotification(t('notify.wsError'), 'error');
  });

  return (
    <div className="app">
      <CurrentPage />
      <OptionsWindow />
      <PregameSystemMenu />
      <CreditsWindow />
      <ProjectCreditsWindow />
      {}
      <LoadingScreen hidden={hideClassic} />
      <WarpFade />
      <AutoDownload />
      {}
      <ReconnectOverlay />
      {}
      <GameCursor />
    </div>
  );
});
