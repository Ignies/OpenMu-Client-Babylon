import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import type { Item } from '../ecs/world';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import {
  ChaosCastleEnterRequestPacket,
  MiniGameOpeningStateRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  BloodCastleStatePacket,
  BloodCastleStateStatusEnum,
  ChaosCastleEnterResultEnterResultEnum,
  ChaosCastleEnterResultPacket,
  MiniGameOpeningStatePacket,
  MiniGameScoreTablePacket,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import {
  EVENT_TEXT,
  OPENING_STATE_GAME,
  TICKETS,
  formatText,
} from './recipes';

/**
 * Chaos Castle: there is no NPC window — the Armor of Guardsman in the
 * inventory asks the server for the opening state, the answer is the
 * `CChaosCastleTimeCheckMsgBoxLayout` prompt (`ReceiveEventZoneOpenTime`,
 * Value 4) whose OK sends `ChaosCastleEnterRequest`. On the castle maps the
 * timer HUD (`CNewUIChaosCastleTime`, NewUIChaosCastleTime.cpp) is fed by
 * the same `BloodCastleState` packet as Blood Castle, states 5..10
 * (`CNewChaosCastleSystem::SetMatchGameCommand`).
 *
 * Driven by: `useTicket`, `enterChaosCastle`, and the `MiniGameOpeningState`
 * / `ChaosCastleEnterResult` / `BloodCastleState` / `MiniGameScoreTable`
 * packets. Read by the prompt, timer and result table in
 * `ui/pages/worldPage/components/events`.
 *
 * Not here: the shrinking arena (states 8..10 add `TW_NOGROUND` rings and
 * play the falling-stone sound) — that is the map's business once the
 * castle maps are staged.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Chaos Castle 1..6 (`WD_18CHAOS_CASTLE..WD_18CHAOS_CASTLE_END`) + the master castle. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_18CHAOS_CASTLE,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 1,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 2,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 3,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 4,
  ENUM_WORLD.WD_18CHAOS_CASTLE_END,
  ENUM_WORLD.WD_53CAOSCASTLE_MASTER_LEVEL,
]);

/** `MAX_CHAOS_CASTLE_MEN`: the number the "castle is full" message quotes. */
const MAX_MEN = 70;
/** `GlobalText[1156]` third argument: the capacity the prompt shows. */
const PROMPT_CAPACITY = 100;
/** `MAX_KILL_MONSTER`: the server sends this when there is no count. */
const NO_KILL_QUOTA = 65535;
/** `SetTime`: the clock turns red under this many minutes. */
const IMMINENT_MINUTES = 5;
/** `SetMatchResult` drops tables of 200 rows and more. */
const MAX_RANK_ROWS = 200;
/** Seconds the rank table stays before it clears itself. */
const RESULT_SECONDS = 20;
/** How long the OK-box substitutes stay on screen. */
const MESSAGE_MS = 5000;

// ---- 2. state + readers ----------------------------------------------------

export type ChaosCastleTimer = {
  seconds: number;
  /** Characters still standing (`GlobalText[1161]`). */
  alive: number;
  maxAlive: number;
  running: boolean;
};

export type ChaosCastlePrompt = {
  lines: string[];
  /** The gate is open right now: OK sends the enter request. */
  canEnter: boolean;
};

export type ChaosCastleResult = {
  myRank: number;
  rows: { name: string; score: number; exp: number; zen: number }[];
};

const state = observable(
  {
    prompt: null as ChaosCastlePrompt | null,
    timer: { seconds: 0, alive: 0, maxAlive: NO_KILL_QUOTA, running: false } as ChaosCastleTimer,
    result: null as ChaosCastleResult | null,
  },
  {},
  { deep: false }
);

/** The ticket the prompt was opened for: `(CastleLevel, inventory slot)`. */
let ticket: { level: number; slot: number } | null = null;
let resultLeft = 0;

export function chaosCastlePrompt(): ChaosCastlePrompt | null {
  return state.prompt;
}

export function chaosCastleTimer(): ChaosCastleTimer {
  return state.timer;
}

export function chaosCastleImminent(): boolean {
  return state.timer.seconds / 60 < IMMINENT_MINUTES;
}

export function chaosCastleResult(): ChaosCastleResult | null {
  return state.result;
}

export function inChaosCastle(map: ENUM_WORLD): boolean {
  return MAPS.has(map);
}

export function closeChaosCastlePrompt(): void {
  runInAction(() => {
    state.prompt = null;
  });
  ticket = null;
}

/** The prompt's OK: `ChaosCastleEnterRequest` for the ticket that opened it. */
export function enterChaosCastle(): void {
  const t = ticket;
  closeChaosCastlePrompt();
  if (!t) return;

  const packet = ChaosCastleEnterRequestPacket.createPacket();
  packet.CastleLevel = t.level;
  packet.TicketItemInventoryIndex = t.slot;
  Store.sendToGS(packet.buffer);
}

/** Double-clicked Armor of Guardsman: ask for the opening state first. */
function useTicket(slot: number, item: Item): boolean {
  const t = TICKETS.armorOfGuardsman;
  if (item.group !== t.group || item.num !== t.num) return false;

  ticket = { level: item.lvl ?? 0, slot };
  const packet = MiniGameOpeningStateRequestPacket.createPacket();
  packet.EventType = OPENING_STATE_GAME.chaosCastle;
  packet.EventLevel = ticket.level;
  Store.sendToGS(packet.buffer);
  return true;
}

function update(map: ENUM_WORLD, dt: number): void {
  const t = state.timer;
  if (t.running && MAPS.has(map) && t.seconds > 0) {
    // Reassigned, not mutated: the observable is shallow.
    runInAction(() => {
      state.timer = { ...t, seconds: Math.max(0, t.seconds - dt) };
    });
  }

  if (state.result) {
    resultLeft -= dt;
    if (resultLeft <= 0) {
      runInAction(() => {
        state.result = null;
      });
    }
  }
}

function clearTimer(): void {
  runInAction(() => {
    state.timer = { seconds: 0, alive: 0, maxAlive: NO_KILL_QUOTA, running: false };
  });
}

function reset(): void {
  closeChaosCastlePrompt();
  clearTimer();
  runInAction(() => {
    state.result = null;
  });
  resultLeft = 0;
}

// ---- packets ---------------------------------------------------------------

/**
 * `ReceiveEventZoneOpenTime`, Value 4: `MAKEWORD(KeyL, KeyH)` minutes until
 * the gate opens; 0 means open now, with the head count on a second line.
 */
EventBus.on('MiniGameOpeningState', packet => {
  const p = new MiniGameOpeningStatePacket(packet);
  if (p.GameType !== OPENING_STATE_GAME.chaosCastle) return;

  const zone = EVENT_TEXT.chaosCastleZone;
  const minutes =
    (p.RemainingEnteringTimeMinutes << 8) | p.RemainingEnteringTimeMinutesLow;

  let prompt: ChaosCastlePrompt;
  if (minutes === 0) {
    prompt = {
      lines: [
        formatText(EVENT_TEXT.enterNow, zone),
        formatText(EVENT_TEXT.ccEntered, zone, p.UserCount, PROMPT_CAPACITY),
      ],
      canEnter: true,
    };
  } else {
    const hours = Math.trunc(minutes / 60);
    // GlobalText[1164] + [851] as `WSclient.cpp:8234` concatenates them; the
    // "when %d " hour prefix only once there is an hour to name.
    const afterMinutes = formatText(
      EVENT_TEXT.enterAfterMinutes,
      minutes - hours * 60,
      zone
    );
    prompt = {
      lines: [
        hours > 0
          ? formatText(EVENT_TEXT.whenHour, hours) + afterMinutes
          : afterMinutes,
      ],
      canEnter: false,
    };
  }
  runInAction(() => {
    state.prompt = prompt;
  });
});

/** `ReceiveMoveToEventMatchResult2`. */
EventBus.on('ChaosCastleEnterResult', packet => {
  const p = new ChaosCastleEnterResultPacket(packet);
  closeChaosCastlePrompt();

  const zone = EVENT_TEXT.chaosCastleZone;
  let text: string | null = null;
  switch (p.Result) {
    case ChaosCastleEnterResultEnterResultEnum.Success:
      break;
    case ChaosCastleEnterResultEnterResultEnum.Failed:
      text = EVENT_TEXT.cloakLevelWrong;
      break;
    case ChaosCastleEnterResultEnterResultEnum.NotOpen:
      text = formatText(EVENT_TEXT.timePassed, zone);
      break;
    case ChaosCastleEnterResultEnterResultEnum.Full:
      text = formatText(EVENT_TEXT.capacityReached, zone, MAX_MEN);
      break;
    case ChaosCastleEnterResultEnterResultEnum.NotEnoughMoney:
      text = EVENT_TEXT.shortOfZen;
      break;
    case ChaosCastleEnterResultEnterResultEnum.PlayerKillerCantEnter:
      text = formatText(EVENT_TEXT.killersRestricted, EVENT_TEXT.chaosCastle);
      break;
    default:
      // 3 / 4 of the original's switch: level out of range.
      text =
        (p.Result as number) === 3 ? EVENT_TEXT.levelTooHigh : EVENT_TEXT.levelTooLow;
      break;
  }
  if (text) Store.addNotification(text, 'error', MESSAGE_MS);
});

/** `CNewChaosCastleSystem::SetMatchGameCommand`: states 5..10. */
EventBus.on('BloodCastleState', packet => {
  const p = new BloodCastleStatePacket(packet);

  switch (p.State) {
    case BloodCastleStateStatusEnum.ChaosCastleRunning:
      runInAction(() => {
        state.timer = {
          seconds: p.RemainSecond,
          alive: p.CurMonster,
          maxAlive: p.MaxMonster,
          running: true,
        };
      });
      break;
    case BloodCastleStateStatusEnum.ChaosCastleEnded:
      clearTimer();
      break;
    default:
      // 5 = started (no clock yet), 8..10 = arena stages; 0..4 = Blood Castle.
      break;
  }
});

/** The shared 0x93 rank table, taken only on the castle maps. */
EventBus.on('MiniGameScoreTable', packet => {
  if (!MAPS.has(Store.world?.mapIndex ?? ENUM_WORLD.WD_0LORENCIA)) return;

  const p = new MiniGameScoreTablePacket(packet);
  if (p.ResultCount >= MAX_RANK_ROWS) return;

  resultLeft = RESULT_SECONDS;
  runInAction(() => {
    state.result = {
      myRank: p.PlayerRank,
      rows: p.getResults().map(r => ({
        name: r.PlayerName,
        // Signed on the wire, read as uint32 by the generated packet (B12).
        score: r.TotalScore | 0,
        exp: r.BonusExperience,
        zen: r.BonusMoney,
      })),
    };
  });
});

// ---- 3. the layer ----------------------------------------------------------

export const chaosCastleLayer: EventLayer = {
  name: 'chaosCastle',
  maps: MAPS,
  update,
  reset,
  state: () => ({ open: state.prompt !== null, running: state.timer.running }),
  useTicket,
};
