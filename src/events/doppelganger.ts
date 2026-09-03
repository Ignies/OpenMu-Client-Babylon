import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import { Store } from '../store';
import { DoppelgangerEnterRequestPacket } from '../common/packets/ClientToServerPackets';
import type { EventLayer } from './layer';

/**
 * Doppelganger: Lugard's gate window (`CNewUIDoppelGangerWindow`,
 * NewUIDoppelGangerWindow.cpp). OpenMU only defines the entry protocol -
 * `NpcWindowResponse` (LugardDoppelgangerEntry) opens the window, the Enter
 * button sends `DoppelgangerEnterRequest` - and its server answers every
 * Doppelganger request with "not implemented yet": no state, result or HUD
 * packet exists, so the in-event frame (`CNewUIDoppelGangerFrame`) is not
 * ported until the server runs the event.
 *
 * Driven by: `NpcWindowResponse` (LugardDoppelgangerEntry) via
 * `openDoppelganger`. Read by: the entry window in
 * `ui/pages/worldPage/components/events`, and `logic.ts` through the facade.
 */

// ---- 1. tuning -------------------------------------------------------------

/** The four arenas (`WD_65DOPPLEGANGER1 .. WD_68DOPPLEGANGER4`). */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_65DOPPLEGANGER1,
  ENUM_WORLD.WD_66DOPPLEGANGER2,
  ENUM_WORLD.WD_67DOPPLEGANGER3,
  ENUM_WORLD.WD_68DOPPLEGANGER4,
]);

/** `BtnProcess`: "no inventory slot, take any Mirror of Dimensions". */
const NO_TICKET_SLOT = 0xff;

// ---- 2. state + readers ----------------------------------------------------

const state = observable(
  {
    open: false,
    // `SetRemainTime`: minutes until the gate opens; non-zero locks Enter.
    // The original reads it from a byte after the window id that OpenMU's
    // NpcWindowResponse does not carry, so it stays 0 (enterable).
    remainMinutes: 0,
  },
  {},
  { deep: false }
);

/** Lugard's window: whether it is up and the Entry Time it shows. */
export function doppelgangerWindow(): { open: boolean; remainMinutes: number } {
  return { open: state.open, remainMinutes: state.remainMinutes };
}

/** `OpeningProcess`: unlock the Enter button and show the window. */
export function openDoppelganger(): void {
  runInAction(() => {
    state.remainMinutes = 0;
    state.open = true;
  });
}

export function closeDoppelganger(): void {
  runInAction(() => {
    state.open = false;
  });
}

/** `SendDoppelgangerEnterRequest(0xFF)`: the Enter button. */
export function enterDoppelganger(): void {
  if (state.remainMinutes !== 0) return;
  const packet = DoppelgangerEnterRequestPacket.createPacket();
  packet.TicketItemSlot = NO_TICKET_SLOT;
  Store.sendToGS(packet.buffer);
}

function reset(): void {
  closeDoppelganger();
}

// ---- 3. the layer ----------------------------------------------------------

export const doppelgangerLayer: EventLayer = {
  name: 'doppelganger',
  maps: MAPS,
  reset,
  state: () => ({ open: state.open, running: false }),
};
