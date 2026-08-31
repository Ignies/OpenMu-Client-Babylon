import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import { BaseClass, getBaseClass } from '../common/characterStats';
import type { Item } from '../ecs/world';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import { skills } from '../skills';
import {
  DevilSquareEnterRequestPacket,
  MiniGameOpeningStateRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  DevilSquareEnterResultEnterResultEnum,
  DevilSquareEnterResultPacket,
  MiniGameOpeningStatePacket,
  MiniGameScoreTablePacket,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import {
  DEVIL_SQUARE_LEVELS,
  EVENT_TEXT,
  OPENING_STATE_GAME,
  TICKETS,
  entryButtons,
  formatText,
  isMasterClass,
  type EntryButton,
} from './recipes';

/**
 * Devil Square: Charon's entry window (`CNewUIEnterDevilSquare`,
 * NewUIEnterDevilSquare.cpp), the Devil's Invitation ticket and the rank
 * table at the end (`CSDevilSquareMatch::SetMatchResult` /
 * `RenderMatchResult`, CSEventMatch.cpp).
 *
 * Driven by: `NpcWindowResponse` (DevilSquare) via `openDevilSquare`, the
 * inventory ticket via `useTicket`, and the `DevilSquareEnterResult` /
 * `MiniGameOpeningState` / `MiniGameScoreTable` packets. Read by the
 * entry window and result table in `ui/pages/worldPage/components/events`.
 *
 * There is no per-second match clock for the square: the original only
 * has the 30 s state countdown line (`matchNotices.ts`).
 */

// ---- 1. tuning -------------------------------------------------------------

/** The square map (`WD_9DEVILSQUARE`) and OpenMU's map 32 for squares 5-7, the same world. */
const MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_9DEVILSQUARE,
  ENUM_WORLD.WD_32DEVILSQUARE_5_7,
]);
/** `GlobalText[1778]` argument: the number the master square button shows. */
const MASTER_SQUARE_NUMBER = 7;
/** Classes whose level table is the second row (`iLimitLVIndex = 1`). */
const LOWER_LIMIT_CLASSES: ReadonlySet<BaseClass> = new Set([
  BaseClass.Knight,
  BaseClass.DarkLord,
  BaseClass.RageFighter,
]);
/** `SetMatchResult` drops tables of 200 rows and more. */
const MAX_RANK_ROWS = 200;
/** Seconds the rank table stays before it clears itself. */
const RESULT_SECONDS = 20;
/** Ticket byte the NPC route sends: "no inventory slot, take any invitation". */
const NO_TICKET_SLOT = 0xff;
/** How long the OK-box substitutes stay on screen. */
const MESSAGE_MS = 5000;

// ---- 2. state + readers ----------------------------------------------------

export type DevilSquareRank = {
  name: string;
  score: number;
  exp: number;
  zen: number;
};

export type DevilSquareResult = {
  /** 1-based rank of the hero, 0 when unplaced. */
  myRank: number;
  rows: DevilSquareRank[];
};

const state = observable(
  {
    open: false,
    buttons: [] as EntryButton[],
    active: -1,
    result: null as DevilSquareResult | null,
  },
  {},
  { deep: false }
);

let resultLeft = 0;

/** Charon's window: whether it is up and its seven buttons. */
export function devilSquareWindow(): {
  open: boolean;
  buttons: EntryButton[];
  active: number;
} {
  return { open: state.open, buttons: state.buttons, active: state.active };
}

/** The rank table, or null when there is none. */
export function devilSquareResult(): DevilSquareResult | null {
  return state.result;
}

export function inDevilSquare(map: ENUM_WORLD): boolean {
  return MAPS.has(map);
}

/** `OpenningProcess`: build the buttons and show the window. */
export function openDevilSquare(): void {
  const pd = Store.playerData;
  const master = isMasterClass(pd.charClass);
  const row = LOWER_LIMIT_CLASSES.has(getBaseClass(pd.charClass)) ? 1 : 0;
  const { buttons, active } = entryButtons(
    DEVIL_SQUARE_LEVELS,
    row,
    master ? skills.masterLevel : pd.level,
    master,
    EVENT_TEXT.squareButton,
    EVENT_TEXT.squareButtonMaster,
    MASTER_SQUARE_NUMBER
  );
  runInAction(() => {
    state.buttons = buttons;
    state.active = active;
    state.open = true;
  });
}

export function closeDevilSquare(): void {
  runInAction(() => {
    state.open = false;
  });
}

/** `SendDevilSquareEnterRequest(m_iNumActiveBtn, 0xFF)`: grade is 0-based. */
export function enterDevilSquare(grade: number): void {
  if (grade !== state.active) return;
  const packet = DevilSquareEnterRequestPacket.createPacket();
  packet.SquareLevel = grade;
  packet.TicketItemInventoryIndex = NO_TICKET_SLOT;
  Store.sendToGS(packet.buffer);
}

/** Double-clicked Devil's Invitation: `SendMiniGameOpeningStateRequest(1, Level)`. */
function useTicket(_slot: number, item: Item): boolean {
  const t = TICKETS.devilInvitation;
  if (item.group !== t.group || item.num !== t.num) return false;

  const packet = MiniGameOpeningStateRequestPacket.createPacket();
  packet.EventType = OPENING_STATE_GAME.devilSquare;
  packet.EventLevel = item.lvl ?? 0;
  Store.sendToGS(packet.buffer);
  return true;
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

function reset(): void {
  closeDevilSquare();
  runInAction(() => {
    state.result = null;
  });
  resultLeft = 0;
}

// ---- packets ---------------------------------------------------------------

/** `ReceiveMoveToDevilSquareResult`. */
EventBus.on('DevilSquareEnterResult', packet => {
  const p = new DevilSquareEnterResultPacket(packet);
  closeDevilSquare();

  let text: string | null = null;
  switch (p.Result) {
    case DevilSquareEnterResultEnterResultEnum.Success:
      break;
    case DevilSquareEnterResultEnterResultEnum.Failed:
      text = EVENT_TEXT.devilBringInvitation;
      break;
    case DevilSquareEnterResultEnterResultEnum.NotOpen:
      text = EVENT_TEXT.devilTooLate;
      break;
    case DevilSquareEnterResultEnterResultEnum.CharacterLevelTooHigh:
      text = EVENT_TEXT.levelTooHigh;
      break;
    case DevilSquareEnterResultEnterResultEnum.CharacterLevelTooLow:
      text = EVENT_TEXT.levelTooLow;
      break;
    case DevilSquareEnterResultEnterResultEnum.Full:
      text = EVENT_TEXT.devilFull;
      break;
    default:
      // 6 in the original's switch: killers.
      text = formatText(EVENT_TEXT.killersRestricted, EVENT_TEXT.devilSquare);
      break;
  }
  if (text) Store.addNotification(text, 'error', MESSAGE_MS);
});

/** `ReceiveEventZoneOpenTime`, Value 1: the invitation's answer. */
EventBus.on('MiniGameOpeningState', packet => {
  const p = new MiniGameOpeningStatePacket(packet);
  if (p.GameType !== OPENING_STATE_GAME.devilSquare) return;

  const minutes = p.RemainingEnteringTimeMinutes;
  Store.addNotification(
    minutes === 0
      ? EVENT_TEXT.devilOpenNow
      : formatText(EVENT_TEXT.devilOpensIn, minutes),
    'info',
    MESSAGE_MS
  );
});

/**
 * `ReceiveDevilSquareRank`: the same 0x93 code as the Blood Castle score;
 * the socket tells them apart by length. Chaos Castle shares this table
 * (chaosCastle.ts), so it is taken only on the square.
 */
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

export const devilSquareLayer: EventLayer = {
  name: 'devilSquare',
  maps: MAPS,
  update,
  reset,
  state: () => ({ open: state.open, running: state.result !== null }),
  useTicket,
};
