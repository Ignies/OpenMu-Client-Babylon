import { t } from './i18n';
import { ServersPage } from './ui/pages/serversPage';
import { observer } from 'mobx-react-lite';
import { Store, UIState } from './store';
import { LoginPage } from './ui/pages/loginPage';
import { CharactersPage } from './ui/pages/charactersPage';
import { WorldPage } from './ui/pages/worldPage';
import { useEventBus } from './hooks/useEventBus';
import { PreloaderPage } from './ui/pages/preloaderPage';
import { LoadingScreen } from './ui/components/loadingScreen';
import { OptionsWindow } from './ui/components/optionsWindow';
import { GameCursor } from './ui/components/gameCursor';

const CurrentPage = observer(() => {
  const state = Store.uiState;

  switch (state) {
    case UIState.Preloader:
      return <PreloaderPage />;
    case UIState.Servers:
      return <ServersPage />;
    case UIState.Login:
      return <LoginPage />;
    case UIState.Characters:
      return <CharactersPage />;
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
