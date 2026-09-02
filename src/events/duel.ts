import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../common/types';
import { cleanName } from '../common/chat';
import { EventBus } from '../libs/eventBus';
import { playUiSound } from '../libs/sfx';
import { Store } from '../store';
import { t } from '../i18n';
import {
  DuelChannelJoinRequestPacket,
  DuelChannelQuitRequestPacket,
  DuelStartResponsePacket,
} from '../common/packets/ClientToServerPackets';
import {
  DuelFinishedPacket,
  DuelHealthUpdatePacket,
  DuelInitPacket,
  DuelScorePacket,
  DuelSpectatorAddedPacket,
  DuelSpectatorListPacket,
  DuelSpectatorRemovedPacket,
  DuelStartRequestPacket as DuelStartRequestS2CPacket,
  DuelStartResultPacket,
  DuelStatusPacket,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import {
  duelStartFailureKey,
  orientPair,
  orientValues,
  presentSpectators,
  roomCountOf,
} from './duelRules';

/**
 * Duel (`DuelMgr.cpp`): the request prompt (`CDuelMsgBoxLayout`), the duelist
 * score panel (`CNewUIDuelWindow`), the Doorkeeper Titus channel window
 * (`CNewUIDuelWatchWindow`), the spectator bar and name list
 * (`CNewUIDuelWatchMainFrameWindow`, `CNewUIDuelWatchUserListWindow`) and the
 * result box (`CDuelResultMsgBox`).
 *
 * Driven by: the twelve `Duel*` S2C packets (all `0xAA`), the Titus
 * `NpcWindowResponse` via `openDuelWatch`, and `commands.ts` (`/duelstart`,
 * `/duelend` keep sending `DuelStartRequest` / `DuelStopRequest` unchanged).
 * Read by: `ui/pages/worldPage/components/duel`.
 *
 * Duel state survives `reset()`: the accept -> warp -> `DuelInit` sequence
 * crosses a map change, and the original clears `g_DuelMgr` only on duel end
 * or connection close (`WSclient.cpp:646`), never on warp.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Seconds the winner/loser box stays before it clears itself. */
const RESULT_SECONDS = 10;
/** How long the notification substitutes stay on screen. */
const MESSAGE_MS = 5000;

// ---- 2. state + readers ----------------------------------------------------

export type DuelSide = { id: number; name: string };

export type DuelScoreboard = {
  /** The hero for a duelist (`InitializeDuelPlugIn` puts the receiver first). */
  side1: DuelSide;
  side2: DuelSide;
  score1: number;
  score2: number;
  /** The hero is a spectator, not one of the two sides. */
  watching: boolean;
};

export type DuelBars = { hp1: number; sd1: number; hp2: number; sd2: number };

export type DuelChannel = {
  name1: string;
  name2: string;
  running: boolean;
  open: boolean;
};

const FULL_BARS: DuelBars = { hp1: 100, sd1: 100, hp2: 100, sd2: 100 };

const state = observable(
  {
    request: null as { requesterId: number; requesterName: string } | null,
    duel: null as DuelScoreboard | null,
    bars: null as DuelBars | null,
    watchOpen: false,
    channels: [] as DuelChannel[],
    spectators: [] as string[],
    result: null as { winner: string; loser: string } | null,
  },
  {},
  { deep: false }
);

let resultLeft = 0;

/** The incoming challenge the prompt shows, or null. */
export function duelRequest(): { requesterId: number; requesterName: string } | null {
  return state.request;
}

/** Sides and scores of the running duel, or null. */
export function duelScoreboard(): DuelScoreboard | null {
  return state.duel;
}

/** Spectator HP/SD percentages; null while not watching. */
export function duelBars(): DuelBars | null {
  return state.bars;
}

/** The Titus window: whether it is up and its channel rows. */
export function duelWatchWindow(): { open: boolean; channels: DuelChannel[] } {
  return { open: state.watchOpen, channels: state.channels };
}

/** Names watching the same duel (spectator list beside the bar). */
export function duelSpectators(): string[] {
  return state.spectators;
}

/** The winner/loser box, or null when there is none. */
export function duelResult(): { winner: string; loser: string } | null {
  return state.result;
}

/** `NpcWindowResponse` DoorkeeperTitusDuelWatch: rows arrive by `DuelStatus`. */
export function openDuelWatch(): void {
  runInAction(() => {
    state.watchOpen = true;
  });
}

export function closeDuelWatch(): void {
  runInAction(() => {
    state.watchOpen = false;
  });
}

/** `SendDuelRequestAnswer` (DuelMgr.cpp): the prompt's OK / Cancel. */
export function answerDuelRequest(accepted: boolean): void {
  const request = state.request;
  if (!request) return;
  runInAction(() => {
    state.request = null;
  });
  if (Store.isOffline) return;
  const packet = DuelStartResponsePacket.createPacket();
  packet.Response = accepted;
  packet.PlayerId = request.requesterId;
  packet.setPlayerName(request.requesterName);
  Store.sendToGS(packet.buffer);
}

/** `SendDuelChannelJoinRequest(i)`: a watch-window join button. */
export function joinDuelChannel(channel: number): void {
  if (Store.isOffline) return;
  const packet = DuelChannelJoinRequestPacket.createPacket();
  packet.ChannelId = channel;
  Store.sendToGS(packet.buffer);
}

/**
 * `SendDuelChannelQuitRequest`: the spectator bar's exit. The server answers
 * with a warp only, so the watching state clears here.
 */
export function quitDuelChannel(): void {
  if (!Store.isOffline) {
    Store.sendToGS(DuelChannelQuitRequestPacket.createPacket().buffer);
  }
  clearDuel();
}

function clearDuel(): void {
  runInAction(() => {
    state.duel = null;
    state.bars = null;
    state.spectators = [];
  });
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (!state.result) return;
  resultLeft -= dt;
  if (resultLeft <= 0) {
    runInAction(() => {
      state.result = null;
    });
  }
}

/** Map changed: transient UI only - `duel` itself survives the arena warp. */
function reset(): void {
  runInAction(() => {
    state.request = null;
    state.watchOpen = false;
    state.channels = [];
    state.result = null;
  });
  resultLeft = 0;
}

// ---- packets ---------------------------------------------------------------

const ID_MASK = 0x7fff;

function heroNetId(): number | null {
  return Store.world?.playerEntity?.netId ?? null;
}

/** `ReceiveDuelRequest`: the challenge prompt. */
EventBus.on('DuelStartRequest', packet => {
  const p = new DuelStartRequestS2CPacket(packet);
  playUiSound('duelWindow');
  runInAction(() => {
    state.request = {
      requesterId: p.RequesterId & ID_MASK,
      requesterName: cleanName(p.RequesterName),
    };
  });
});

/** `ReceiveDuelStart`: our own request was answered (or failed early). */
EventBus.on('DuelStartResult', packet => {
  const p = new DuelStartResultPacket(packet);
  const name = cleanName(p.OpponentName);
  const failure = duelStartFailureKey(p.Result);
  if (failure === null) {
    playUiSound('duelStart');
    Store.addNotification(t('duel.started', { name }), 'info', MESSAGE_MS);
    return;
  }
  const text =
    failure === 'duel.refused' ? t(failure, { name }) : t(failure);
  Store.addNotification(text, 'error', MESSAGE_MS);
});

/** `ReceiveDuelWatchRequestReply` + duel start: sides, ids, perspective. */
EventBus.on('DuelInit', packet => {
  const p = new DuelInitPacket(packet);
  if (p.Result !== 0) return;
  const side1: DuelSide = { id: p.Player1Id & ID_MASK, name: cleanName(p.Player1Name) };
  const side2: DuelSide = { id: p.Player2Id & ID_MASK, name: cleanName(p.Player2Name) };
  const hero = heroNetId();
  const watching = hero !== side1.id && hero !== side2.id;
  playUiSound('duelStart');
  runInAction(() => {
    state.duel = { side1, side2, score1: 0, score2: 0, watching };
    state.bars = watching ? FULL_BARS : null;
    if (watching) state.watchOpen = false;
  });
});

/** Spectators only, right after `DuelInit`: bars back to full. */
EventBus.on('DuelHealthBarInit', () => {
  if (!state.duel?.watching) return;
  runInAction(() => {
    state.bars = FULL_BARS;
  });
});

/** `ReceiveDuelScore` (WSclient.cpp:8465): scores by id, not by order. */
EventBus.on('DuelScore', packet => {
  const duel = state.duel;
  if (!duel) return;
  const p = new DuelScorePacket(packet);
  const way = orientPair(duel.side1.id, duel.side2.id, p.Player1Id, p.Player2Id);
  if (!way) return;
  const [score1, score2] = orientValues(way, p.Player1Score, p.Player2Score);
  runInAction(() => {
    state.duel = { ...duel, score1, score2 };
  });
});

/** `ReceiveDuelHP`: the spectator gauges. */
EventBus.on('DuelHealthUpdate', packet => {
  const duel = state.duel;
  if (!duel) return;
  const p = new DuelHealthUpdatePacket(packet);
  const way = orientPair(duel.side1.id, duel.side2.id, p.Player1Id, p.Player2Id);
  if (!way) return;
  const [hp1, hp2] = orientValues(way, p.Player1HealthPercentage, p.Player2HealthPercentage);
  const [sd1, sd2] = orientValues(way, p.Player1ShieldPercentage, p.Player2ShieldPercentage);
  runInAction(() => {
    state.bars = { hp1, sd1, hp2, sd2 };
  });
});

/** `ReceiveDuelEnd`: OpenMU always sends Result 0 and no name - just clear. */
EventBus.on('DuelEnd', () => {
  if (state.duel && !state.duel.watching) {
    Store.addNotification(t('duel.ended'), 'info', MESSAGE_MS);
  }
  clearDuel();
});

/** `ReceiveDuelResult`: the winner/loser box. */
EventBus.on('DuelFinished', packet => {
  const p = new DuelFinishedPacket(packet);
  playUiSound('duelWindow');
  resultLeft = RESULT_SECONDS;
  runInAction(() => {
    state.result = { winner: cleanName(p.Winner), loser: cleanName(p.Loser) };
  });
});

/** `ReceiveDuelChannelList`: pushed every 5 s while the Titus window is open. */
EventBus.on('DuelStatus', packet => {
  const p = new DuelStatusPacket(packet);
  const rooms = p.getRooms(roomCountOf(packet.byteLength));
  runInAction(() => {
    state.channels = rooms.map(room => ({
      name1: cleanName(room.Player1Name),
      name2: cleanName(room.Player2Name),
      running: Boolean(room.DuelRunning),
      open: Boolean(room.DuelOpen),
    }));
  });
});

/** `ReceiveDuelWatcherJoin` / `Quit` / `List`. */
EventBus.on('DuelSpectatorAdded', packet => {
  const p = new DuelSpectatorAddedPacket(packet);
  const name = cleanName(p.Name);
  if (!name || state.spectators.includes(name)) return;
  runInAction(() => {
    state.spectators = [...state.spectators, name];
  });
});

EventBus.on('DuelSpectatorRemoved', packet => {
  const p = new DuelSpectatorRemovedPacket(packet);
  const name = cleanName(p.Name);
  runInAction(() => {
    state.spectators = state.spectators.filter(n => n !== name);
  });
});

EventBus.on('DuelSpectatorList', packet => {
  const p = new DuelSpectatorListPacket(packet);
  // OpenMU never fills Count: read every slot, keep the real names.
  const names = presentSpectators(p.getSpectators(10).map(s => s.Name));
  runInAction(() => {
    state.spectators = names;
  });
});

/** `DuelMgr.Reset()` on connection close (WSclient.cpp:646). */
EventBus.on('wsClosed', () => {
  clearDuel();
  reset();
});

// ---- 3. the layer ----------------------------------------------------------

export const duelLayer: EventLayer = {
  name: 'duel',
  update,
  reset,
  state: () => ({
    open: state.request !== null || state.watchOpen,
    running: state.duel !== null,
  }),
};
