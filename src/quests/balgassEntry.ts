/**
 * The two entry boxes of the third class quests: the Werewolf Guardsman in
 * Crywolf sends a party to the Barracks of Balgass (legacy quests 5 and 6),
 * the Gatekeeper in the Barracks lets it on to Balgass' Refuge (quest 6).
 * Ported from ZzzInterface.cpp:1606-1621 and `CMapEnterWerwolfMsgBoxLayout` /
 * `CMapEnterGateKeeperMsgBoxLayout` (NewUICommonMessageBox.cpp:1091-1177).
 *
 * Driven by: the NPC click (`talkToBalgassNpc`, through `quests.useNpc`),
 * `npcTalkStarted` and the map change. Read by: the box in
 * `ui/pages/worldPage/components/balgassEntry`.
 */
import { observable, runInAction } from 'mobx';
import { t } from '../i18n';
import { devQuery } from '../common/devSeams';
import { ENUM_WORLD } from '../common/types';
import {
  CloseNpcRequestPacket,
  EnterOnGatekeeperRequestPacket,
  EnterOnWerewolfRequestPacket,
} from '../common/packets/ClientToServerPackets';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import { LegacyQuestState, legacyQuestState } from './legacyQuests';

// ---- 1. tuning -------------------------------------------------------------

/** `MODEL_NPC_QUARREL` on Crywolf, the Gatekeeper in the Barracks (OpenMU's numbers). */
const WEREWOLF_NPC = 407;
const GATEKEEPER_NPC = 408;
const WEREWOLF_MAP = ENUM_WORLD.WD_34CRYWOLF_1ST;
const GATEKEEPER_MAP = ENUM_WORLD.WD_41CHANGEUP3RD_1ST;

/** `QUEST_3RD_CHANGE_UP_2` / `_3`: Infiltration of the Barracks, Into the Darkness Zone. */
const QUEST_BARRACKS = 5;
const QUEST_REFUGE = 6;

/** Zen the Werewolf takes (`dwGold >= 3000000`, EnterBarracksOfBalgassAction). */
const BARRACKS_PRICE = 3_000_000;

// ---- 2. state + readers ----------------------------------------------------

export type BalgassEntryKind = 'werewolf' | 'gatekeeper';

export type BalgassEntryBox = { kind: BalgassEntryKind; canEnter: boolean };

type NpcTarget = { netId: number; name: string; npcType: number };

const state = observable({ kind: null as BalgassEntryKind | null }, {}, { deep: false });

/** `?balgass=` staged a box offline; `,1` unlocks its OK. Cleared once answered. */
let devKind: BalgassEntryKind | null = null;
let devUnlocked = false;
let devRead = false;

/**
 * `LockOkButton`, held to OpenMU's `EnterQuestMapAction` rather than the
 * original's (which also unlocks the Werewolf once quest 5 is done), so OK is
 * never pressed for a refusal the server only logs: its active quest must be
 * 5 or 6 for the Barracks, and 6 for the Refuge.
 */
function canEnter(kind: BalgassEntryKind): boolean {
  if (devUnlocked) return true;
  const barracks = legacyQuestState(QUEST_BARRACKS);
  const refuge = legacyQuestState(QUEST_REFUGE);
  if (kind === 'gatekeeper') return refuge === LegacyQuestState.InProgress;
  return (
    barracks === LegacyQuestState.InProgress ||
    (barracks === LegacyQuestState.Finished && refuge === LegacyQuestState.InProgress)
  );
}

/** The box that is up, if any, and whether its OK is unlocked. */
export function balgassEntryBox(): BalgassEntryBox | null {
  const kind = state.kind;
  return kind ? { kind, canEnter: canEnter(kind) } : null;
}

export function balgassEntryOpen(): boolean {
  return state.kind !== null;
}

function show(kind: BalgassEntryKind): void {
  runInAction(() => {
    state.kind = kind;
  });
}

function hide(): void {
  devKind = null;
  devUnlocked = false;
  runInAction(() => {
    state.kind = null;
  });
}

function entryFor(npcType: number): BalgassEntryKind | null {
  const map = Store.world?.mapIndex;
  if (npcType === WEREWOLF_NPC && map === WEREWOLF_MAP) return 'werewolf';
  if (npcType === GATEKEEPER_NPC && map === GATEKEEPER_MAP) return 'gatekeeper';
  return null;
}

// ---- commands --------------------------------------------------------------

/**
 * The NPC click. OpenMU's enter needs the talk (OpenedNpc 407 / 408), so the
 * talk goes out as it does for any NPC, and the box opens after it: the
 * talk's `npcTalkStarted` hides every NPC window. Returns true when taken.
 */
export function talkToBalgassNpc(npc: NpcTarget): boolean {
  const kind = entryFor(npc.npcType);
  // `talkToNpc` ignores a click behind a shop or a held item; so does the box.
  if (!kind || Store.pendingItemMove || Store.npcShop) return false;

  // Offline, a talk opens the test merchant; only the `HideAll` half applies.
  if (Store.isOffline) EventBus.emit('npcTalkStarted', { npcType: npc.npcType });
  else Store.talkToNpc(npc);
  show(kind);
  return true;
}

/** `OkBtnDown`: the Werewolf wants his fee first; either way the box closes. */
export function enterBalgass(): void {
  const kind = state.kind;
  if (!kind || !canEnter(kind)) return;
  hide();

  if (kind === 'werewolf' && Store.playerData.money < BARRACKS_PRICE) {
    Store.addNotification(t('event.shortOfZen'), 'error');
    return;
  }
  if (Store.isOffline) return;

  const packet =
    kind === 'werewolf'
      ? EnterOnWerewolfRequestPacket.createPacket()
      : EnterOnGatekeeperRequestPacket.createPacket();
  Store.sendToGS(packet.buffer);
}

/**
 * Cancel, Escape or any close without entering. The Gatekeeper leaves OpenMU
 * in NpcDialogOpened (GatekeeperNpcPlugin), which refuses potions until closed.
 */
export function cancelBalgassEntry(): void {
  if (!state.kind) return;
  hide();
  if (!Store.isOffline) Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
  Store.dropNpcTalk();
}

// Another talk started: that talk already sends the close for this one.
EventBus.on('npcTalkStarted', () => hide());
// `UpdateSendMoveInterface`: walking off is a cancel.
EventBus.on('heroWalked', () => cancelBalgassEntry());

// ---- the offline dev seam --------------------------------------------------

/**
 * Offline only (`?balgass=werewolf` or `?balgass=gatekeeper`, `,1` to unlock
 * OK): open the box without a server, for the screenshots. Re-opened after a
 * map load until answered, so the load order cannot swallow it.
 */
function stageDevBox(): void {
  if (!devRead) {
    devRead = true;
    const [kind, unlock] = (devQuery('balgass') ?? '').split(',');
    if (Store.isOffline && (kind === 'werewolf' || kind === 'gatekeeper')) {
      devKind = kind;
      devUnlocked = unlock === '1';
    }
  }
  if (devKind && !state.kind && Store.world?.playerEntity) show(devKind);
}

function update(_map: ENUM_WORLD, _dt: number): void {
  stageDevBox();
}

/** `ReceiveMapChange` hides the box; the warp itself ended the NPC talk. */
function reset(): void {
  runInAction(() => {
    state.kind = null;
  });
}

// ---- 3. the layer ----------------------------------------------------------

export const balgassEntryLayer: QuestLayer = { name: 'balgassEntry', update, reset };
