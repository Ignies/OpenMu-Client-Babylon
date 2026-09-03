import { observable, runInAction } from 'mobx';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import { t } from '../i18n';
import { ItemGroup } from '../common/itemStats';
import {
  EventChipExitDialogPacket,
  EventChipRegistrationRequestPacket,
} from '../common/packets/ClientToServerPackets';
import { EventChipRegistrationResultPacket } from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';

/**
 * Golden Archer (NPC 236): Rena registration (`CNewUIGoldBowmanLena`,
 * NewUIGoldBowmanLena.cpp). Talking to the NPC makes OpenMU answer with
 * `EventChipRegistrationResult` (no `NpcWindowResponse`): result 0 opens or
 * refreshes the dialog, result 1 is "no Rena in the inventory"
 * (ItemRegistrationResultPlugIn.cs / GoldenArcherWindowHandlerPlugIn.cs).
 * The Register button sends `EventChipRegistrationRequest`; the server picks
 * the Rena itself, pays the reward and answers with the updated counts.
 * Closing sends `EventChipExitDialog`, which resets NpcDialogOpened.
 */

/** Rena: items.json group 14, index 21 - what the register request points at. */
const RENA = { group: ItemGroup.Potion, num: 21 } as const;

/** The reference sends type 0 for the Rena dialog (`SendEventChipRegistrationRequest(0, index)`). */
const REGISTRATION_TYPE_RENA = 0;

/** Only `MissingItem` gets a distinct result byte; 0 is open/refresh. */
const RESULT_MISSING_ITEM = 1;

const MESSAGE_MS = 5000;

// ---- state + readers --------------------------------------------------------

const state = observable(
  {
    open: false,
    /** `RegisteredCount`: Rena turned in so far (server-side stat). */
    registered: 0,
    /** `RemainingInventoryCount`: Rena the server counted in the bag. */
    remaining: 0,
  },
  {},
  { deep: false }
);

export function goldenArcherWindow(): {
  open: boolean;
  registered: number;
  remaining: number;
} {
  return { open: state.open, registered: state.registered, remaining: state.remaining };
}

// ---- commands ----------------------------------------------------------------

/** The Register button: point the server at the first Rena in the bag. */
export function registerRena(): void {
  if (!state.open || Store.isOffline) return;

  const slot = Store.playerData.items.findIndex(
    item => item?.group === RENA.group && item?.num === RENA.num
  );
  if (slot < 0) {
    Store.addNotification(t('goldenArcher.noRena'), 'error', MESSAGE_MS);
    return;
  }

  const packet = EventChipRegistrationRequestPacket.createPacket();
  packet.Type = REGISTRATION_TYPE_RENA;
  packet.ItemIndex = slot;
  Store.sendToGS(packet.buffer);
}

/**
 * `ClosingProcess`: `SendEventChipExitDialog` - OpenMU keeps the character in
 * NpcDialogOpened until it arrives. `notify` is false when the dialog is
 * already gone server-side (map change, relog).
 */
export function closeGoldenArcher(notify = true): void {
  if (!state.open) return;
  if (notify && !Store.isOffline) {
    Store.sendToGS(EventChipExitDialogPacket.createPacket().buffer);
  }
  runInAction(() => {
    state.open = false;
  });
}

// ---- packets ------------------------------------------------------------------

/** `ReceiveEventChipInfomation` (0x94): open or refresh the dialog. */
EventBus.on('EventChipRegistrationResult', packet => {
  const p = new EventChipRegistrationResultPacket(packet);

  if (p.Result === RESULT_MISSING_ITEM) {
    runInAction(() => {
      state.remaining = p.RemainingInventoryCount;
    });
    Store.addNotification(t('goldenArcher.noRena'), 'error', MESSAGE_MS);
    return;
  }

  Store.dropNpcTalk();
  runInAction(() => {
    state.registered = p.RegisteredCount;
    state.remaining = p.RemainingInventoryCount;
    state.open = true;
  });
});

// ---- the layer ------------------------------------------------------------------

export const goldenArcherLayer: EventLayer = {
  name: 'goldenArcher',
  // The warp already dropped the dialog server-side: close without the packet.
  reset: () => closeGoldenArcher(false),
  state: () => ({ open: state.open, running: false }),
};
