import { t } from './i18n';
import { ServersPage } from './ui/pages/serversPage';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { Store, UIState } from './store';
import { loadVersionUi } from './version';
import { WorldPage } from './ui/pages/worldPage';
import { useEventBus } from './hooks/useEventBus';
import { PreloaderPage } from './ui/pages/preloaderPage';
import { LoadingScreen } from './ui/components/loadingScreen';
import { OptionsWindow } from './ui/components/optionsWindow';
import { GameCursor } from './ui/components/gameCursor';

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
  const state = Store.uiState;

  switch (state) {
    case UIState.Preloader:
      return <PreloaderPage />;
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

export const App = observer(() => {
  useEventBus('wsError', () => {
    Store.addNotification(t('notify.wsError'), 'error');
  });

  return (
    <div className="app">
      <CurrentPage />
      <OptionsWindow />
      {}
      <LoadingScreen />
      {}
      <GameCursor />
    </div>
  );
});
