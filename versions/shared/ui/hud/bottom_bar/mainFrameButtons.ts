import { MuWindows } from '@/controllers/interface/windowManager';
import type { TextKey } from '@/i18n';
import { Messenger } from '@/features/friends/messenger';
import { toggleMarketplace } from '@/features/marketplace/gameBridge';

/**
 * The five buttons on the right of the main frame (`newui_menu_Bt01..05`), in
 * the order the bar draws them.
 *
 * Listed here rather than inline in the bar because the mobile HUD draws the
 * same five at a touchable size - on a phone the bar's own copies sit past
 * the right edge of the screen - and the two must not drift apart.
 */
export type MainFrameButton = {
  file: string;
  titleKey: TextKey;
  toggle: () => void;
};

export const MAIN_FRAME_BUTTONS: readonly MainFrameButton[] = [
  {
    file: 'partCharge1/newui_menu_Bt05.OZJ',
    titleKey: 'bottomBar.itemShop',
    toggle: () => toggleMarketplace(),
  },
  {
    file: 'partCharge1/newui_menu_Bt01.OZJ',
    titleKey: 'bottomBar.characterInfo',
    toggle: () => {
      MuWindows.setOpen('character_info', !MuWindows.isOpen('character_info'));
    },
  },
  {
    file: 'partCharge1/newui_menu_Bt02.OZJ',
    titleKey: 'bottomBar.inventory',
    toggle: () => {
      MuWindows.setOpen('inventory', !MuWindows.isOpen('inventory'));
    },
  },
  {
    file: 'partCharge1/newui_menu_Bt03.OZJ',
    titleKey: 'bottomBar.friendList',
    toggle: () => Messenger.toggleWindow(),
  },
  {
    file: 'partCharge1/newui_menu_Bt04.OZJ',
    titleKey: 'bottomBar.options',
    toggle: () => {
      MuWindows.setOpen('options', !MuWindows.isOpen('options'));
    },
  },
];

/** `newui_menu_Bt0*` frame geometry: three 30x41 frames stacked. */
export const MAIN_FRAME_BUTTON_WIDTH = 30;
export const MAIN_FRAME_BUTTON_HEIGHT = 41;
export const MAIN_FRAME_BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;
