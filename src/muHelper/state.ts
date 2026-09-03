import { observable, reaction, runInAction } from 'mobx';
import { Store } from '../store';
import { MuHelperSaveDataRequestPacket } from '../common/packets/ClientToServerPackets';
import {
  decodeMuHelperConfig,
  defaultMuHelperConfig,
  encodeMuHelperConfig,
  type MuHelperConfig,
} from './config';

/**
 * MU Helper state: the live config the loop follows and the window's draft.
 * Single writer of both; `logic.ts` keeps landing the raw blob in
 * `Store.muHelper.config` and a reaction decodes it here (the deferred
 * pattern of `skills/buffs.ts` - at module evaluation `Store` is still in
 * its temporal dead zone).
 */
export const MuHelperState = observable({
  windowOpen: false,
  config: defaultMuHelperConfig() as MuHelperConfig,
  draft: defaultMuHelperConfig() as MuHelperConfig,
});

/** Canonical clone: what survives the wire is what the copy holds. */
function cloneConfig(config: MuHelperConfig): MuHelperConfig {
  return decodeMuHelperConfig(encodeMuHelperConfig(config));
}

let stopWatching: (() => void) | null = null;

/** Start following the stored blob. Safe to call every frame/render. */
export function ensureMuHelperWatching(): void {
  if (stopWatching) return;
  stopWatching = reaction(
    () => Store.muHelper.config,
    blob => {
      if (!blob) return;
      runInAction(() => {
        MuHelperState.config = decodeMuHelperConfig(blob);
        // A save echo while the window is up must not stomp live edits.
        if (!MuHelperState.windowOpen) {
          MuHelperState.draft = cloneConfig(MuHelperState.config);
        }
      });
    },
    { fireImmediately: true }
  );
}

export function toggleMuHelperWindow(open?: boolean): void {
  ensureMuHelperWatching();
  runInAction(() => {
    const next = open ?? !MuHelperState.windowOpen;
    if (next) MuHelperState.draft = cloneConfig(MuHelperState.config);
    MuHelperState.windowOpen = next;
  });
}

/** The Init button (`CNewUIMuHelper::Reset` defaults). */
export function resetMuHelperDraft(): void {
  runInAction(() => {
    MuHelperState.draft = defaultMuHelperConfig();
  });
}

/**
 * `SaveConfig` (NewUIMuHelper.cpp:1095-1116): apply the draft and send
 * `MuHelperSaveDataRequest`; the server echoes `MuHelperConfigurationData`.
 * Offline the config only applies locally.
 */
export function saveMuHelperConfig(): void {
  const blob = encodeMuHelperConfig(MuHelperState.draft);
  runInAction(() => {
    MuHelperState.config = decodeMuHelperConfig(blob);
    MuHelperState.windowOpen = false;
  });
  if (Store.isOffline) return;
  const packet = MuHelperSaveDataRequestPacket.createPacket();
  packet.setHelperData(blob);
  Store.sendToGS(packet.buffer);
}
