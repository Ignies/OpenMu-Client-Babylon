import { observable, runInAction } from 'mobx';
import { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import {
  CrywolfContractRequestPacket,
  CrywolfInfoRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  CrywolfAltarInfoPacket,
  CrywolfBenefitPacket,
  CrywolfBossMonsterInfoPacket,
  CrywolfContractResultPacket,
  CrywolfLeftTimePacket,
  CrywolfStateInfoPacket,
  CrywolfStateInfoEventStateEnum as CrywolfState,
  CrywolfStateInfoOccupationStateEnum as Occupation,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import { EVENT_TEXT, formatText } from './recipes';

export {
  CrywolfStateInfoEventStateEnum as CrywolfState,
  CrywolfStateInfoOccupationStateEnum as CrywolfOccupation,
} from '../common/packets/ServerToClientPackets';

/**
 * Crywolf: the fortress event's state (`M34CryWolf1st`, GMCrywolf1st.cpp),
 * the interface bar's numbers (`CNewUICryWolf`, NewUICryWolf.cpp) and the
 * statue contract. OpenMU defines the three 0xBD requests but implements
 * none of the event (`Progress.md`: CrywolfGroup 0%), so against a stock
 * server this layer stays in its peace defaults; the answers it reads are
 * the S6E3 layouts (WSclient.cpp:13911-13955) for servers that send them.
 *
 * Driven by: `warpCompleted` (the info request, WSclient.cpp:789) and the
 * `CrywolfStateInfo` / `CrywolfAltarInfo` / `CrywolfContractResult` /
 * `CrywolfLeftTime` / `CrywolfBossMonsterInfo` / `CrywolfBenefit` packets.
 * Read by: `CrywolfBar` in `ui/pages/worldPage/components/events` and the
 * staging classes in `maps/crywolf`.
 */

// ---- 1. tuning -------------------------------------------------------------

const MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_34CRYWOLF_1ST]);

/** `MONSTER_WOLF_STATUS`: the wolf statue NPC the contract goes to. */
const STATUE_NPC = 204;

/** `m_AltarState` boot value: every altar idle, grade 2. */
const IDLE_ALTAR = 2;

/** `TotDelay` at 25 fps: how long the success/failure banner stays. */
const RESULT_SECONDS = 16;

/** `GlobalText[1948]` cap: the dark elf line reads (n/12). */
export const DARK_ELF_MAX = 12;

/** `GetTimeCheck(10000)`: seconds each ready-state notice page stays. */
const NOTICE_PAGE_SECONDS = 10;
const NOTICE_PAGES = 4;

const MESSAGE_MS = 5000;

// ---- 2. state + readers ----------------------------------------------------

export type CrywolfHud = {
  occupation: Occupation;
  state: CrywolfState;
  /** 0..100, the statue shield the bar erodes. */
  statueHp: number;
  /** Packed bytes: high nibble contracted flag, low nibble grade. */
  altars: readonly number[];
  darkElves: number;
  /** 0..100; the Balgass strip shows while > 0. */
  balgassHp: number;
  /** Seconds left of the war, counted down between `CrywolfLeftTime` resyncs. */
  seconds: number;
};

const state = observable(
  {
    occupation: Occupation.Peace,
    state: CrywolfState.None,
    statueHp: 0,
    altars: [IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR] as readonly number[],
    darkElves: 0,
    balgassHp: 0,
    seconds: 0,
    timeRunning: false,
    /** `Suc_Or_Fail`: the end-of-war banner, or null. */
    result: null as boolean | null,
    noticePage: 0,
  },
  {},
  { deep: false }
);

let resultLeft = 0;
let noticeLeft = NOTICE_PAGE_SECONDS;

/** Everything the interface bar draws. */
export function crywolfHud(): CrywolfHud {
  return state;
}

/** `g_pNewUISystem->Show(INTERFACE_CRYWOLF)`: bar up from READY until END. */
export function crywolfBarVisible(map: ENUM_WORLD): boolean {
  return (
    MAPS.has(map) &&
    state.state >= CrywolfState.Ready &&
    state.state < CrywolfState.EndCycle
  );
}

/** The end banner: true success, false failure, null none. */
export function crywolfResult(): boolean | null {
  return state.result;
}

/** `RenderNoticesCryWolf`: which four-line notice page is up (READY only). */
export function crywolfNoticePage(): number {
  return state.noticePage;
}

export function inCrywolf(map: ENUM_WORLD): boolean {
  return MAPS.has(map);
}

/** `SendCrywolfContractRequest`: talk to the wolf statue during READY. */
function useNpc(npc: { netId: number; npcType: number }): boolean {
  if (npc.npcType !== STATUE_NPC) return false;
  if (Store.world === null || !MAPS.has(Store.world.mapIndex)) return false;

  if (state.state === CrywolfState.Ready && !Store.isOffline) {
    const packet = CrywolfContractRequestPacket.createPacket();
    packet.StatueId = npc.netId;
    Store.sendToGS(packet.buffer);
  }
  // The statue never opens a server window; consume the talk either way.
  return true;
}

function update(map: ENUM_WORLD, dt: number): void {
  if (state.timeRunning && MAPS.has(map) && state.seconds > 0) {
    runInAction(() => {
      state.seconds = Math.max(0, state.seconds - dt);
      if (state.seconds === 0) state.timeRunning = false;
    });
  }

  if (state.result !== null) {
    resultLeft -= dt;
    if (resultLeft <= 0) {
      runInAction(() => {
        state.result = null;
      });
    }
  }

  if (state.state === CrywolfState.Ready && MAPS.has(map)) {
    noticeLeft -= dt;
    if (noticeLeft <= 0) {
      noticeLeft = NOTICE_PAGE_SECONDS;
      runInAction(() => {
        state.noticePage = (state.noticePage + 1) % NOTICE_PAGES;
      });
    }
  }
}

/** `CryWolfMVPInit` (WSclient.cpp:688): every warp drops the tracked event. */
function reset(): void {
  resultLeft = 0;
  noticeLeft = NOTICE_PAGE_SECONDS;
  runInAction(() => {
    state.occupation = Occupation.Peace;
    state.state = CrywolfState.None;
    state.statueHp = 0;
    state.altars = [IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR, IDLE_ALTAR];
    state.darkElves = 0;
    state.balgassHp = 0;
    state.seconds = 0;
    state.timeRunning = false;
    state.result = null;
    state.noticePage = 0;
  });
}

// ---- packets ---------------------------------------------------------------

/** WSclient.cpp:789: entering the map asks for the event state. */
EventBus.on('warpCompleted', ({ map }) => {
  if (!MAPS.has(map) || Store.isOffline) return;
  Store.sendToGS(CrywolfInfoRequestPacket.createPacket().buffer);
});

/** `CheckCryWolf1stMVP`: the state pair, and the end-of-war banner. */
EventBus.on('CrywolfStateInfo', packet => {
  const p = new CrywolfStateInfoPacket(packet);
  const occupation = p.Occupation;
  const next = p.State;
  if (occupation === state.occupation && next === state.state) return;

  runInAction(() => {
    // `if (m_CrywolfState == CRYWOLF_STATE_END)`: outside the war the banner
    // says whether the defence held (peace) or the fortress fell (occupied).
    if (next === CrywolfState.Ended && occupation !== Occupation.War) {
      state.result = occupation === Occupation.Peace;
      resultLeft = RESULT_SECONDS;
    }
    if (next !== CrywolfState.Started) state.balgassHp = 0;
    state.occupation = occupation;
    state.state = next;
  });
});

/** `CheckCryWolf1stMVPAltarfInfo`: statue shield plus the five altars. */
EventBus.on('CrywolfAltarInfo', packet => {
  const p = new CrywolfAltarInfoPacket(packet);
  runInAction(() => {
    state.statueHp = p.StatueHp;
    state.altars = [
      p.AltarState1,
      p.AltarState2,
      p.AltarState3,
      p.AltarState4,
      p.AltarState5,
    ];
  });
});

/** `ReceiveCrywolfAltarContract` (WSclient.cpp:11431). */
EventBus.on('CrywolfContractResult', packet => {
  const p = new CrywolfContractResultPacket(packet);
  if (p.Result === 1) {
    Store.addNotification(EVENT_TEXT.cwContractMade, 'info', MESSAGE_MS);
  } else {
    Store.addNotification(EVENT_TEXT.cwContractRefused, 'error', MESSAGE_MS);
  }
});

/** `M34CryWolf1st::SetTime`: only meaningful while the war runs. */
EventBus.on('CrywolfLeftTime', packet => {
  const p = new CrywolfLeftTimePacket(packet);
  if (state.state !== CrywolfState.Started) return;
  runInAction(() => {
    state.seconds = p.Hour * 3600 + p.Minute * 60;
    state.timeRunning = true;
  });
});

/** `Set_BossMonster`: the Balgass strip and the dark elf count. */
EventBus.on('CrywolfBossMonsterInfo', packet => {
  const p = new CrywolfBossMonsterInfoPacket(packet);
  if (state.state < CrywolfState.Ready || state.state >= CrywolfState.EndCycle) return;
  runInAction(() => {
    state.darkElves = p.DarkElfCount;
    state.balgassHp = Math.max(0, p.BossHp | 0);
  });
});

/** `SetPlusChaosRate`: a won event raises mix rates; surface it as a line. */
EventBus.on('CrywolfBenefit', packet => {
  const p = new CrywolfBenefitPacket(packet);
  if (p.ChaosRatePlus > 0) {
    Store.addNotification(
      formatText(EVENT_TEXT.cwBenefit, p.ChaosRatePlus),
      'info',
      MESSAGE_MS
    );
  }
});

// ---- 3. the layer ----------------------------------------------------------

export const crywolfLayer: EventLayer = {
  name: 'crywolf',
  maps: MAPS,
  update,
  reset,
  state: () => ({
    open: false,
    running:
      state.state >= CrywolfState.Ready && state.state < CrywolfState.EndCycle,
  }),
  useNpc,
};
