import { MuWindows } from '@/controllers/interface/windowManager';
import { isKey } from '@/controllers/interface/keyBindings';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '@/app/store';
import { GameOptions } from '@/modules/options/gameOptions';
import { useEventBus } from '@/controllers/interface/hooks/useEventBus';
import { playUiSound } from '@/controllers/sound/sfx';
import { MinimapSheet } from './sheet';
import { MinimapCorner } from './corner';

/**
 * The world map: the original's full-screen sheet on TAB (`sheet.tsx`)
 * and, with the `minimapCorner` option (the default), a small copy of it
 * that stays in the top right corner while the sheet is down
 * (`corner.tsx`). TAB opens and closes the sheet; Escape closes it, as the
 * original's does.
 */

const HOT_KEY = 'minimap';

export const Minimap = observer(() => {
  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      if (!Store.world?.playerEntity) return;
      runInAction(() => {
        MuWindows.setOpen('minimap', !MuWindows.isOpen('minimap'));
      });
      playUiSound('click');
    } else if (key === 'Escape' && MuWindows.isOpen('minimap')) {
      runInAction(() => {
        MuWindows.setOpen('minimap', false);
      });
      playUiSound('click');
    }
  });

  return (
    <>
      {GameOptions.minimapCorner && <MinimapCorner />}
      <MinimapSheet />
    </>
  );
});
