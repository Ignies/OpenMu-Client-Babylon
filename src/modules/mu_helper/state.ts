import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { t } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { addNotification } from '../chat';
import { Session } from '../session';
import { moduleOn } from '../module';
import { Hero } from '../hero';
import { GameOptions } from '@/controllers/settings';
import { LocalStorage } from '@/core/localStorage';
import { restoreExtraItems } from './itemFilters';
import {
  MuHelperSaveDataRequestPacket,
  MuHelperStatusChangeRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import {
  decodeMuHelperConfig as decodeBlob,
  defaultMuHelperConfig,
  encodeMuHelperConfig,
  type MuHelperConfig,
} from './config';

/**
 * `MUHelper::g_MuHelper`: running or paused, the zen it has cost, and the config blob the server
 * keeps for it (`MuHelperConfigurationData`, decoded into `MuHelperState` below).
 */
export const MuHelper = new (class {
  /** Running (`Start`) vs paused (`Stop`). */
  active = false;
  /** The last zen the server charged for it (`ConsumeMoney`). */
  lastMoneyConsumed = 0;
  /** Zen charged since the helper last started (`m_iTotalCost`). */
  totalMoneyConsumed = 0;
  /** The saved config blob (`MuHelperConfigurationData`, 257 bytes). */
  config: Uint8Array | null = null;

  constructor() {
    makeObservable(this, {
      active: observable,
      lastMoneyConsumed: observable,
      totalMoneyConsumed: observable,
      config: observable,
      setMuHelperStatus: action,
      setMuHelperConfig: action,
    });
  }

  setMuHelperStatus(active: boolean, moneyConsumed: number) {
    const changed = this.active !== active;
    this.active = active;
    if (changed && active) this.totalMoneyConsumed = 0;
    if (moneyConsumed > 0) {
      this.lastMoneyConsumed = moneyConsumed;
      // The running-total line of `ReceiveMuHelperStatusUpdate`
      // (WSclient.cpp:1199-1207, GlobalText 3586).
      this.totalMoneyConsumed += moneyConsumed;
      addNotification(
        t('notify.helperCost', {
          total: this.totalMoneyConsumed.toLocaleString('en-US'),
        }),
        'info'
      );
    }
    // `[MU Helper] Started` / `Stopped` (MuHelper.cpp:116/122) go to the console log.
    if (changed) {
      addNotification(
        t(active ? 'notify.helperStarted' : 'notify.helperStopped'),
        'info'
      );
    }
  }

  /**
   * `CMuHelper::Toggle` (the Start / Stop button of `CNewUIHeroPositionInfo`,
   * the Home key of the retail client): `MuHelperStatusChangeRequest` with
   * `PauseStatus` = running. `TriggerStart` refuses in a safe zone; the
   * server answers with `MuHelperStatusUpdate`, which flips `active`.
   */
  toggleMuHelper() {
    // Off (a version or a world without it): the key does nothing.
    if (!moduleOn('mu_helper')) return;
    const active = this.active;
    if (Session.isOffline) {
      // No server to answer: flip locally so the loop can be exercised
      // against the test scene.
      if (!active && Ecs.world?.playerEntity?.attributeSystem?.isAboveZero('inSafeZone')) {
        addNotification(t('notify.helperSafeZone'), 'error');
        return;
      }
      this.setMuHelperStatus(!active, 0);
      return;
    }
    if (!active && Ecs.world?.playerEntity?.attributeSystem?.isAboveZero('inSafeZone')) {
      addNotification(t('notify.helperSafeZone'), 'error');
      return;
    }
    const packet = MuHelperStatusChangeRequestPacket.createPacket();
    packet.PauseStatus = active;
    Session.sendToGS(packet.buffer);
  }

  setMuHelperConfig(config: Uint8Array) {
    this.config = config;
  }
})();

/**
 * MU Helper state: the live config the loop follows and the window's draft.
 * Single writer of both; `net.ts` lands the raw blob in `MuHelper.config` and a
 * reaction decodes it here, started on first use (`ensureMuHelperWatching`).
 */
export const MuHelperState = observable({
  windowOpen: false,
  config: defaultMuHelperConfig() as MuHelperConfig,
  draft: defaultMuHelperConfig() as MuHelperConfig,
});

/** The extra items as typed, per character, for the item filters: the blob keeps 14 characters. */
const typedItemsKey = () => `mu_helper_items:${Hero.name}`;

function typedItems(): string[] {
  try {
    const list: unknown = JSON.parse(LocalStorage.load(typedItemsKey()) ?? '[]');
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The blob's config; with the player's item filters on, each extra item's whole text put back. */
function decodeMuHelperConfig(blob: Uint8Array): MuHelperConfig {
  const config = decodeBlob(blob);
  if (GameOptions.helperItemFilters) config.extraItems = restoreExtraItems(config.extraItems, typedItems());
  return config;
}

/** Canonical clone: what survives the wire is what the copy holds. */
function cloneConfig(config: MuHelperConfig): MuHelperConfig {
  return decodeMuHelperConfig(encodeMuHelperConfig(config));
}

let stopWatching: (() => void) | null = null;

/** Start following the stored blob. Safe to call every frame/render. */
export function ensureMuHelperWatching(): void {
  if (stopWatching) return;
  stopWatching = reaction(
    () => MuHelper.config,
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
  if (GameOptions.helperItemFilters) LocalStorage.save(typedItemsKey(), JSON.stringify(MuHelperState.draft.extraItems));
  const blob = encodeMuHelperConfig(MuHelperState.draft);
  runInAction(() => {
    MuHelperState.config = decodeMuHelperConfig(blob);
    MuHelperState.windowOpen = false;
  });
  if (Session.isOffline) return;
  const packet = MuHelperSaveDataRequestPacket.createPacket();
  packet.setHelperData(blob);
  Session.sendToGS(packet.buffer);
}
