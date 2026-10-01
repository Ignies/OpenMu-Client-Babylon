/// <reference types="vite/client" />
import { defineWindow, registerWindows, type WindowDef } from '@/controllers/interface/windows';
import { MsgWindow } from '@/controllers/interface/components/msg_window';
import { PickedItemCursor } from '@/controllers/interface/components/picked_item';

// Every window and HUD element under windows/ and hud/ registers itself from its
// window.ts: adding one is adding its folder. A version replaces one by
// registering the same id from versions/<id>/ui.
const files = import.meta.glob<{ default: WindowDef | WindowDef[] }>('./{windows,hud}/*/window.{ts,tsx}', { eager: true });

registerWindows(Object.values(files).flatMap(m => m.default));

// The interface controller's own pieces, placed in the shared layout.
registerWindows([
  defineWindow({ id: 'msg_window', slot: 'hud', order: 360, component: MsgWindow }),
  defineWindow({ id: 'picked_item', slot: 'hud', order: 500, component: PickedItemCursor }),
]);
