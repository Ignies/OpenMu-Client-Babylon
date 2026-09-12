import { isKey } from '../../../../../common/keyBindings';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { GameOptions } from '../../../../../common/gameOptions';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound } from '../../../../../libs/sfx';
import { MinimapSheet } from './sheet';
import { MinimapCorner } from './corner';

/**
 * The world map, one of two ways: the original's full-screen TAB sheet
 * (`sheet.tsx`) or, with the `minimapCorner` option (the default), a small
 * copy of it that stays in the top right corner (`corner.tsx`). TAB opens
 * and closes the sheet, or shows and hides the panel; Escape closes the
 * sheet, as the original's does.
 */

const HOT_KEY = 'minimap';

export const Minimap = observer(() => {
  const corner = GameOptions.minimapCorner;

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      if (!Store.world?.playerEntity) return;
      runInAction(() => {
        if (GameOptions.minimapCorner) {
          Store.minimapCornerHidden = !Store.minimapCornerHidden;
        } else {
          Store.minimapEnabled = !Store.minimapEnabled;
        }
      });
      playUiSound('click');
    } else if (key === 'Escape' && Store.minimapEnabled) {
      runInAction(() => {
        Store.minimapEnabled = false;
      });
      playUiSound('click');
    }
  });

  // An open sheet cannot outlive the option: while `minimapEnabled` is set
  // every other hot key is swallowed, and there would be no sheet to close.
  useEffect(() => {
    if (corner && Store.minimapEnabled) {
      runInAction(() => {
        Store.minimapEnabled = false;
      });
    }
  }, [corner]);

  return corner ? <MinimapCorner /> : <MinimapSheet />;
});
