import { t } from '../i18n';
import { ServersPage } from '@versions/shared/ui/pages/server_select';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { addNotification } from '../modules/chat';
import { AppState, UIState } from './uiState';
import { loadVersionUi } from '../version';
import { WorldPage } from '@versions/shared/ui/pages/world';
import { useEventBus } from '../controllers/interface/hooks/useEventBus';
import { PreloaderPage } from '@versions/shared/ui/pages/preloader';
import { playOffline } from './offline';
import { LoadingScreen } from '../controllers/loading/classic';
import { OptionsWindow } from '@versions/shared/ui/windows/options';
import { GameCursor } from '../controllers/interface/components/game_cursor';
import { ReconnectOverlay } from '@versions/shared/ui/components/reconnect_overlay';

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
      return <PreloaderPage onPlayOffline={playOffline} />;
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

export const App = observer(() => {
  useEventBus('wsError', () => {
    addNotification(t('notify.wsError'), 'error');
  });

  return (
    <div className="app">
      <CurrentPage />
      <OptionsWindow />
      {}
      <LoadingScreen hidden={onPreloader} />
      {}
      <ReconnectOverlay />
      {}
      <GameCursor />
    </div>
  );
});
