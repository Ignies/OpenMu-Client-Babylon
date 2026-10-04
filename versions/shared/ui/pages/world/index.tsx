import './style.less';
import '../../index';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { AppState } from '@/controllers/interface/uiState';
import { isKey } from '@/controllers/interface/keyBindings';
import { useEventBus } from '@/controllers/interface/hooks';
import { shownWindows } from './shown';

/** Every registered window and HUD element whose module is on, in stacking order. Each one hides itself when closed. */
const HUD = observer(() => (
  <div className="hud">
    {shownWindows('hud').map(w => (
      <w.component key={w.id} />
    ))}
  </div>
));

export const WorldPage = observer(() => {
  useEventBus('keyPressed', key => {
    if (isKey('hideUi', key)) {
      runInAction(() => (AppState.hudHidden = !AppState.hudHidden));
    }
  });

  return (
    <div className="world-page">
      {/* Over the world, under the HUD and outside it: the hide-interface key leaves these up. */}
      {shownWindows('world').map(w => (
        <w.component key={w.id} />
      ))}
      {!AppState.hudHidden && <HUD />}
    </div>
  );
});
