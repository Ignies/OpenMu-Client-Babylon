import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import { BaseClass, getBaseClass } from '../common/characterStats';
import type { Item } from '../ecs/world';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import {
  BloodCastleEnterRequestPacket,
  MiniGameOpeningStateRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  BloodCastleEnterResultEnterResultEnum,
  BloodCastleEnterResultPacket,
  BloodCastleScorePacket,
  BloodCastleStatePacket,
  BloodCastleStateStatusEnum,
  MiniGameOpeningStatePacket,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import { noteOpeningStateRequest, takeOpeningState } from './schedule';
import {
  BLOOD_CASTLE_LEVELS,
  EVENT_TEXT,
  OPENING_STATE_GAME,
  TICKETS,
  entryButtons,
  formatText,
  isMasterClass,
  type EntryButton,
} from './recipes';

/**
 * Blood Castle: the Archangel's messenger window (`CNewUIEnterBloodCastle`,
 * NewUIBloodCastleEnter.cpp), the Cloak of Invisibility ticket, the match
 * timer the castle maps show (`CNewUIBloodCastle`, NewUIBloodCastleTime.cpp,
 * fed by `ReceiveMatchGameCommand` → `CNewBloodCastleSystem::SetMatchGameCommand`)
 * and the result box (`RenderMatchResult`).
 *
 * Driven by: `NpcWindowResponse` (BloodCastle) via `openBloodCastle`, the
 * inventory ticket via `useTicket`, and the `BloodCastleEnterResult` /
 * `MiniGameOpeningState` / `BloodCastleState` / `BloodCastleScore` packets.
 * Read by: the entry window and timer HUD in
 * `ui/pages/worldPage/components/events`, and `logic.ts` through the facade.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Blood Castle 1..7 (`WD_11BLOODCASTLE1..WD_11BLOODCASTLE_END`) + the master castle. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_11BLOODCASTLE1,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 1,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 2,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 3,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 4,
  ENUM_WORLD.WD_11BLOODCASTLE1 + 5,
  ENUM_WORLD.WD_11BLOODCASTLE_END,
  ENUM_WORLD.WD_52BLOODCASTLE_MASTER_LEVEL,
]);

/** `MAX_BLOOD_CASTLE_MEN`: the number the "castle is full" message quotes. */
const MAX_MEN = 10;
/** `GlobalText[867]` argument: entries allowed per day. */
const TIMES_PER_DAY = 6;
/** `MAX_KILL_MONSTER`: the server sends this when there is no kill quota. */
const NO_KILL_QUOTA = 65535;
/** `SetTime`: the clock turns red under this many minutes. */
const IMMINENT_MINUTES = 5;
/** `GlobalText[1779]` argument: the number the master castle button shows. */
const MASTER_CASTLE_NUMBER = 8;
/** Classes whose level table is the second row (`iLimitLVIndex = 1`). */
const LOWER_LIMIT_CLASSES: ReadonlySet<BaseClass> = new Set([
  BaseClass.Knight,
  BaseClass.DarkLord,
  BaseClass.RageFighter,
]);
/** Seconds the result box stays before it clears itself. */
const RESULT_SECONDS = 15;
/**
 * Nobody is carrying it. The original tests `m_wIndex != 65535` alone
 * (NewBloodCastleSystem.cpp:50), which is not enough here: the server writes
 * `questItemOwner?.GetId(player) ?? 0xFF` into that 16-bit field, so an
 * unclaimed weapon says 255, not 65535 - and it says it for the whole first
 * half of the match, because the item exists from the moment it is dropped
 * and only gains an owner when someone picks it up. Read 65535 as a real id
 * and the weapon goes on the back of whichever character happens to hold
 * object id 255.
 */
const NO_QUEST_OWNER: ReadonlySet<number> = new Set([0xff, 0xffff]);
const QUEST_ITEM_LEVELS = 3;
/** `Key &= 0x7FFF` before the lookup (NewBloodCastleSystem.cpp:51). */
const OWNER_ID_MASK = 0x7fff;
/** Ticket byte the NPC route sends: "no inventory slot, take any cloak". */
const NO_TICKET_SLOT = 0xff;
/** How long the OK-box substitutes stay on screen. */
const MESSAGE_MS = 5000;

// ---- 2. state + readers ----------------------------------------------------

export type BloodCastleTimer = {
  /** Seconds left in the match; counted down between `BloodCastleState` resyncs. */
  seconds: number;
  killed: number;
  /** `NO_KILL_QUOTA` hides the count line. */
  maxKill: number;
  /** `GetMatchType() == 5`: the gate is down, the count is Magic Skeletons. */
  gateDestroyed: boolean;
  running: boolean;
};

/**
 * Who is carrying the Archangel weapon, and which of the three it is
 * (`c->EtcPart`, NewBloodCastleSystem.cpp:48-58). `level` is 1 staff, 2
 * sword, 3 crossbow - the server sends the item's level plus one.
 */
export type BloodCastleQuestItem = {
  /** The carrier's object id, masked the way `HangerBloodCastleQuestItem` does. */
  ownerId: number;
  level: 1 | 2 | 3;
};

export type BloodCastleScore = {
  success: boolean;
  name: string;
  score: number;
  exp: number;
  zen: number;
};

const state = observable(
  {
    open: false,
    buttons: [] as EntryButton[],
    active: -1,
    timer: {
      seconds: 0,
      killed: 0,
      maxKill: NO_KILL_QUOTA,
      gateDestroyed: false,
      running: false,
    } as BloodCastleTimer,
    score: null as BloodCastleScore | null,
    questItem: null as BloodCastleQuestItem | null,
  },
  {},
  { deep: false }
);

let scoreLeft = 0;

/** The messenger window: whether it is up and its eight buttons. */
export function bloodCastleWindow(): {
  open: boolean;
  buttons: EntryButton[];
  active: number;
} {
  return { open: state.open, buttons: state.buttons, active: state.active };
}

/** The match timer the castle HUD draws. */
export function bloodCastleTimer(): BloodCastleTimer {
  return state.timer;
}

/** `SetTime`: red clock under five minutes. */
export function bloodCastleImminent(): boolean {
  return state.timer.seconds / 60 < IMMINENT_MINUTES;
}

/** Who carries the Archangel weapon, or null while nobody does. */
export function bloodCastleQuestItem(): BloodCastleQuestItem | null {
  return state.questItem;
}

/** The result box, or null when there is none. */
export function bloodCastleScore(): BloodCastleScore | null {
  return state.score;
}

/** Whether a Blood Castle timer is what the HUD should draw on this map. */
export function inBloodCastle(map: ENUM_WORLD): boolean {
  return MAPS.has(map);
}

/** `OpenningProcess` + `Render`: build the buttons and show the window. */
export function openBloodCastle(): void {
  const pd = Store.playerData;
  const row = LOWER_LIMIT_CLASSES.has(getBaseClass(pd.charClass)) ? 1 : 0;
  const { buttons, active } = entryButtons(
    BLOOD_CASTLE_LEVELS,
    row,
    pd.level,
    isMasterClass(pd.charClass),
    EVENT_TEXT.castleButton,
    EVENT_TEXT.castleButtonMaster,
    MASTER_CASTLE_NUMBER
  );
  runInAction(() => {
    state.buttons = buttons;
    state.active = active;
    state.open = true;
  });
}

export function closeBloodCastle(): void {
  runInAction(() => {
    state.open = false;
  });
}

/** `SendBloodCastleEnterRequest(m_iNumActiveBtn + 1, 0xFF)`. */
export function enterBloodCastle(grade: number): void {
  if (grade !== state.active) return;
  const packet = BloodCastleEnterRequestPacket.createPacket();
  packet.CastleLevel = grade + 1;
  packet.TicketItemInventoryIndex = NO_TICKET_SLOT;
  Store.sendToGS(packet.buffer);
}

/**
 * `CNewUIMyInventory` on a double-clicked Cloak of Invisibility:
 * `SendMiniGameOpeningStateRequest(2, Level - 1)`; a +0 cloak is refused.
 */
function useTicket(_slot: number, item: Item): boolean {
  const t = TICKETS.invisibilityCloak;
  if (item.group !== t.group || item.num !== t.num) return false;

  const level = item.lvl ?? 0;
  if (level === 0) {
    Store.addNotification(EVENT_TEXT.cloakLevelWrong, 'error', MESSAGE_MS);
    return true;
  }

  noteOpeningStateRequest(OPENING_STATE_GAME.bloodCastle);
  const packet = MiniGameOpeningStateRequestPacket.createPacket();
  packet.EventType = OPENING_STATE_GAME.bloodCastle;
  packet.EventLevel = level - 1;
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

  if (state.score) {
    scoreLeft -= dt;
    if (scoreLeft <= 0) {
      runInAction(() => {
        state.score = null;
      });
    }
  }
}

function clearTimer(): void {
  runInAction(() => {
    state.timer = {
      seconds: 0,
      killed: 0,
      maxKill: NO_KILL_QUOTA,
      gateDestroyed: false,
      running: false,
    };
    state.questItem = null;
  });
}

function reset(): void {
  closeBloodCastle();
  clearTimer();
  runInAction(() => {
    state.score = null;
  });
  scoreLeft = 0;
}

// ---- packets ---------------------------------------------------------------

/** `ReceiveMoveToEventMatchResult`: close the window, explain a refusal. */
EventBus.on('BloodCastleEnterResult', packet => {
  const p = new BloodCastleEnterResultPacket(packet);
  closeBloodCastle();

  const zone = EVENT_TEXT.bloodCastleZone;
  let text: string | null = null;
  switch (p.Result) {
    case BloodCastleEnterResultEnterResultEnum.Success:
      break;
    case BloodCastleEnterResultEnterResultEnum.Failed:
      text = EVENT_TEXT.cloakLevelWrong;
      break;
    case BloodCastleEnterResultEnterResultEnum.NotOpen:
      text = formatText(EVENT_TEXT.timePassed, zone);
      break;
    case BloodCastleEnterResultEnterResultEnum.CharacterLevelTooHigh:
      text = EVENT_TEXT.levelTooHigh;
      break;
    case BloodCastleEnterResultEnterResultEnum.CharacterLevelTooLow:
      text = EVENT_TEXT.levelTooLow;
      break;
    case BloodCastleEnterResultEnterResultEnum.Full:
      text = formatText(EVENT_TEXT.capacityReached, zone, MAX_MEN);
      break;
    default:
      // 6 / 7 of the original's switch: per-day limit, killers.
      text =
        (p.Result as number) === 6
          ? formatText(EVENT_TEXT.timesPerDay, TIMES_PER_DAY)
          : formatText(EVENT_TEXT.killersRestricted, EVENT_TEXT.bloodCastle);
      break;
  }
  if (text) Store.addNotification(text, 'error', MESSAGE_MS);
});

/** `ReceiveEventZoneOpenTime`, Value 2: the cloak's answer. */
EventBus.on('MiniGameOpeningState', packet => {
  const p = new MiniGameOpeningStatePacket(packet);
  if (p.GameType !== OPENING_STATE_GAME.bloodCastle) return;

  const minutes = p.RemainingEnteringTimeMinutes;
  // The HUD rows ask the same question on their own timer; those answers
  // feed the schedule and say nothing.
  if (takeOpeningState(OPENING_STATE_GAME.bloodCastle, minutes)) return;

  const zone = EVENT_TEXT.bloodCastleZone;
  Store.addNotification(
    minutes === 0
      ? formatText(EVENT_TEXT.enterNow, zone)
      : formatText(EVENT_TEXT.enterAfterMinutes, minutes, zone),
    'info',
    MESSAGE_MS
  );
});

/**
 * `HangerBloodCastleQuestItem(data->m_wIndex)` then
 * `c->EtcPart = data->m_byItemType` (NewBloodCastleSystem.cpp:48-58): the
 * running state names whoever picked the Archangel weapon up and which of the
 * three it is. 65535 / 255 / 0 all mean nobody.
 */
function readQuestItem(p: BloodCastleStatePacket): void {
  const owner = p.ItemOwnerId;
  const level = p.ItemLevel;

  const carried =
    !NO_QUEST_OWNER.has(owner) && level >= 1 && level <= QUEST_ITEM_LEVELS;

  const next: BloodCastleQuestItem | null = carried
    ? { ownerId: owner & OWNER_ID_MASK, level: level as 1 | 2 | 3 }
    : null;

  const now = state.questItem;
  if (now?.ownerId === next?.ownerId && now?.level === next?.level) return;

  runInAction(() => {
    state.questItem = next;
  });
}

/** `SetMatchGameCommand` (NewBloodCastleSystem.cpp): states 0..4. */
EventBus.on('BloodCastleState', packet => {
  const p = new BloodCastleStatePacket(packet);

  switch (p.State) {
    case BloodCastleStateStatusEnum.BloodCastleStarted:
    case BloodCastleStateStatusEnum.BloodCastleGateNotDestroyed:
    case BloodCastleStateStatusEnum.BloodCastleGateDestroyed:
      runInAction(() => {
        state.timer = {
          seconds: p.RemainSecond,
          killed: p.CurMonster,
          maxKill: p.MaxMonster,
          gateDestroyed:
            p.State === BloodCastleStateStatusEnum.BloodCastleGateDestroyed,
          running: true,
        };
      });
      readQuestItem(p);
      break;
    case BloodCastleStateStatusEnum.BloodCastleEnded:
      clearTimer();
      break;
    default:
      // 5..10 belong to Chaos Castle (chaosCastle.ts).
      break;
  }
});

/** `ReceiveDevilSquareRank` with the 29-byte Blood Castle body. */
EventBus.on('BloodCastleScore', packet => {
  const p = new BloodCastleScorePacket(packet);
  scoreLeft = RESULT_SECONDS;
  runInAction(() => {
    state.score = {
      success: p.Success,
      name: p.PlayerName,
      // The generated reader is `getUint32`; the server sends a signed score
      // (a failed castle is -300 -> 4294966996 otherwise, B12). `| 0` is the
      // int32 reinterpretation without touching the generated file.
      score: p.TotalScore | 0,
      exp: p.BonusExperience,
      zen: p.BonusMoney,
    };
  });
});

// ---- 3. the layer ----------------------------------------------------------

export const bloodCastleLayer: EventLayer = {
  name: 'bloodCastle',
  maps: MAPS,
  update,
  reset,
  state: () => ({ open: state.open, running: state.timer.running }),
  useTicket,
};
