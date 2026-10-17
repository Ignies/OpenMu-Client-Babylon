import { EventBus } from '../../core/eventBus';
import { setLookState } from '../../controllers/monsters';
import {
  RaklionCurrentStatePacket,
  RaklionStateChangePacket,
  RaklionStateInfoPacket,
} from '@versions/shared/packets/ServerToClientPackets';

/**
 * Raklion: the event state (`CGM_Raklion`, GM_Raklion.cpp) and Selupan's pattern. The original keeps both for the
 * whole session (`g_Raklion` is made once, w_MapProcess.cpp:32) and draws no HUD for them.
 *
 * Driven by: `RaklionStateInfo`, `RaklionCurrentState` and `RaklionStateChange` (0xD1 0x10-0x12, WSclient.cpp:12338),
 * which OpenMU's `RaklionEventViewPlugIn` sends. Read by: Selupan's look (the `raklionSelupan` look state).
 */

/** `RAKLION_STATE_DETAIL_STATE` (GM_Raklion.h:30): the state byte that carries Selupan's pattern instead. */
const DETAIL_STATE = 11;

let eventState = 0;
let selupanState = 0;

/** `m_byState`: `RAKLION_STATE_*` (GM_Raklion.h:17-31). */
export function raklionState(): number {
  return eventState;
}

/** `m_byDetailState`: `BATTLE_OF_SELUPAN_*` (GM_Raklion.h:34-46). */
export function raklionSelupanState(): number {
  return selupanState;
}

/** `CGM_Raklion::SetState` (GM_Raklion.cpp:2747). */
function setState(state: number, detail: number): void {
  if (state === DETAIL_STATE) selupanState = detail;
  else eventState = state;
}

/** Registers Raklion's listeners; the events module installs it (module.ts). */
export function installRaklion(): void {
  setLookState('raklionSelupan', raklionSelupanState);
  EventBus.on('RaklionStateInfo', packet => {
    const p = new RaklionStateInfoPacket(packet);
    setState(p.State, p.DetailState);
  });
  EventBus.on('RaklionCurrentState', packet => {
    const p = new RaklionCurrentStatePacket(packet);
    setState(p.State, p.DetailState);
  });
  EventBus.on('RaklionStateChange', packet => {
    const p = new RaklionStateChangePacket(packet);
    setState(p.State, p.DetailState);
  });
}
