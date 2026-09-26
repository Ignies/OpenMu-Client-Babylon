import { observable, runInAction } from 'mobx';
import { Vector3 } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { playSfx } from '../libs/sfx';
import { Store } from '../store';
import { effects } from '../effects';
import { MODEL } from '../effects/recipes';
import {
  KanturuEnterRequestPacket,
  KanturuInfoRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  KanturuBattleResultPacket,
  KanturuEnterResultPacket,
  KanturuMayaWideAreaAttackPacket,
  KanturuMonsterUserCountPacket,
  KanturuStateChangePacket,
  KanturuStateInfoPacket,
  KanturuTimeLimitPacket,
  KanturuStateInfoStateTypeEnum as KanturuState,
  KanturuEnterResultEnterResultEnum as EnterResult,
  KanturuBattleResultBattleResultEnum as BattleResult,
  KanturuMayaWideAreaAttackAttackTypeEnum as MayaAttack,
} from '../common/packets/ServerToClientPackets';
import type { Sounds } from '../sound/recipes';
import { startGatewayTurn } from '../maps/kanturu2/gateway';
import type { EventLayer } from './layer';
import { EVENT_TEXT, formatText } from './recipes';

/**
 * Kanturu Refinery Tower: the Gateway Machine's entry dialog
 * (`CNewUIKanturu2ndEnterNpc`, NewUIKanturuEvent.cpp) and the in-event HUD
 * (`CNewUIKanturuInfoWindow` plus `M39Kanturu3rd`, GM_Kanturu_3rd.cpp).
 *
 * Driven by: the seven `0xD1` packets. `KanturuStateInfo` answers a talk to
 * the machine and opens the dialog; `KanturuStateChange`,
 * `KanturuMonsterUserCount`, `KanturuTimeLimit` and `KanturuBattleResult`
 * drive the HUD while the hero is on the event map;
 * `KanturuMayaWideAreaAttack` is cosmetic. Read by: the windows in
 * `ui/pages/worldPage/components/events`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** The gateway stands in Kanturu Relics; the HUD belongs to the event map. */
const GATEWAY_MAP = ENUM_WORLD.WD_38KANTURU_2ND;
const EVENT_MAP = ENUM_WORLD.WD_39KANTURU_3RD;

const MAPS: ReadonlySet<ENUM_WORLD> = new Set([GATEWAY_MAP, EVENT_MAP]);

/**
 * `KANTURU_MAYA_DIRECTION_TYPE` (_enum.h:3716). The dialog's text turns on
 * these; the three STANBY values are the windows in which a new player may
 * still join a Maya phase.
 */
const MAYA = {
  none: 0,
  standby1: 1,
  notify: 2,
  monster1: 3,
  maya1: 4,
  endMaya1: 5,
  endCycleMaya1: 6,
  standby2: 7,
  monster2: 8,
  maya2: 9,
  endMaya2: 10,
  endCycleMaya2: 11,
  standby3: 12,
  monster3: 13,
  maya3: 14,
  endMaya3: 15,
  endCycleMaya3: 16,
  end: 17,
  endCycle: 18,
} as const;

/** `KANTURU_NIGHTMARE_DIRECTION_TYPE` (_enum.h:3739). */
const NIGHTMARE = { none: 0, idle: 1, nightmare: 2, battle: 3, end: 4 } as const;

/** `KANTURU_TOWER_STATE_TYPE` (_enum.h:3749). */
const TOWER = { none: 0, revitalization: 1, notify: 2, close: 3 } as const;

/** `if (btUserCount < 15)`: the party the Maya phase wants before it opens. */
const MAYA_TARGET_PLAYERS = 15;

/**
 * `Kanturu3rdSuccess` / `Kanturu3rdFailed`: the banner fades in at 0.01 an
 * (original 25 fps) frame and clears 5 s after it is full.
 */
const RESULT_FADE_PER_SECOND = 0.25;
const RESULT_HOLD_SECONDS = 5;

/** `g_Time.GetTimeCheck(0, 1000)`, `iMayaSkill2_Counter > 3`: the stone rain. */
const RAIN_BURSTS = 4;
const RAIN_INTERVAL = 1;

const MESSAGE_MS = 5000;

/**
 * The cutscenes' one-shots (`CKanturuDirection`): the camera flies from the
 * hero to the spot a tile per original frame, then Maya rises
 * (GM_Kanturu_3rd.cpp:228), explodes (:1597) or, `wait` seconds on, the
 * Nightmare is summoned (CDirection.cpp:249).
 */
type DirectionCue = { key: Sounds; x: number; y: number; wait: number };
const MAYA_RISES: DirectionCue = {
  key: 'Sound/w39/maya_intro',
  x: 196,
  y: 85,
  wait: 0,
};
const MAYA_DIES: DirectionCue = { ...MAYA_RISES, key: 'Sound/w39/maya_death' };
const NIGHTMARE_SUMMONED: DirectionCue = {
  key: 'Sound/w39/maya_death',
  x: 80,
  y: 142,
  wait: 1,
};
const ORIGINAL_FPS = 25;
/** The frames around the flight: the target set, the arrival, the cue. */
const DIRECTION_FRAMES = 3;

// ---- 2. state + readers ----------------------------------------------------

export type KanturuDialog = {
  open: boolean;
  /** The blue heading, then the green body lines under it. */
  subject: string;
  lines: readonly string[];
  canEnter: boolean;
};

export type KanturuHud = {
  /** The 99x78 figure is up only during a wave or the Nightmare fight. */
  open: boolean;
  userCount: number;
  monsterCount: number;
  /** The wave is Maya herself: the figure says "Boss" instead of a count. */
  boss: boolean;
  seconds: number;
};

const state = observable(
  {
    open: false,
    state: KanturuState.None as KanturuState,
    detail: 0,
    canEnter: false,
    userCount: 0,
    remainSeconds: 0,

    hudOpen: false,
    hudState: KanturuState.None as KanturuState,
    hudDetail: 0,
    monsterCount: 0,
    seconds: 0,

    /** null = no banner; the fade is 0..1 while it shows. */
    result: null as boolean | null,
    resultAlpha: 0,
  },
  {},
  { deep: false }
);

/** Seconds the full banner has been held, so it can clear itself. */
let resultHeld = 0;
/** `KanturuSuccessMap`: the Elphis barrier is down. */
let towerOpen = false;
/** The state pair last seen in the tower: a resent one restarts no cutscene. */
let lastPhase = -1;
/** The cutscene one-shot waiting out its camera flight, and the time left. */
let cue: DirectionCue | null = null;
let cueDelay = 0;
/** Bursts left of the stone rain, and the gap to the next one. */
let rainLeft = 0;
let rainDelay = 0;

/**
 * `ReceiveKanturu3rdInfo`: the subject line and the one to three body lines
 * the dialog shows for the state pair it was handed.
 */
function dialogText(
  kanturuState: KanturuState,
  detail: number,
  userCount: number,
  remainSeconds: number,
  canEnter: boolean
): { subject: string; lines: string[] } {
  const T = EVENT_TEXT;

  if (kanturuState === KanturuState.Tower) {
    if (detail === TOWER.revitalization || detail === TOWER.notify) {
      return {
        subject: T.ktTowerOpen,
        lines: [
          T.ktPathOpened,
          formatText(T.ktPathClosesIn, Math.floor(remainSeconds / 3600)),
        ],
      };
    }
    return {
      subject: T.ktNoWarp,
      lines: [T.ktDefeatNightmare, T.ktMoonstoneRequired],
    };
  }

  if (kanturuState === KanturuState.MayaBattle) {
    const joinable =
      detail === MAYA.standby1 || detail === MAYA.standby2 || detail === MAYA.standby3;

    if (!joinable) {
      const lines = [formatText(T.ktPlayersOpening, userCount)];
      // The hand the wave is fighting, from the sub-phase.
      if (
        detail === MAYA.notify ||
        detail === MAYA.monster1 ||
        detail === MAYA.maya1 ||
        detail === MAYA.endMaya1 ||
        detail === MAYA.endCycleMaya1
      ) {
        lines.push(formatText(T.ktInBattleLeft, userCount));
      } else if (
        detail === MAYA.monster2 ||
        detail === MAYA.maya2 ||
        detail === MAYA.endMaya2 ||
        detail === MAYA.endCycleMaya2
      ) {
        lines.push(formatText(T.ktInBattleRight, userCount));
      } else if (
        detail === MAYA.monster3 ||
        detail === MAYA.maya3 ||
        detail === MAYA.endMaya3 ||
        detail === MAYA.endCycleMaya3
      ) {
        lines.push(formatText(T.ktInBattleBoth, userCount));
      }
      return { subject: T.ktMayaOngoing, lines };
    }

    const subject = T.ktMorePlayersNeeded;

    if (detail === MAYA.standby1) {
      // The original reads the Moonstone Pendant refusal off the count; the
      // server says plainly whether this character may enter, so trust that.
      return { subject, lines: [canEnter ? T.ktMayNowEnter : T.ktMoonstoneFailed] };
    }

    // GlobalText[2165] / [2166] under the target, [2168] / [2169] at it. The
    // original prints the left-hand line for both phases at the target and
    // leaves [2169] unused; say which hand it actually was.
    const left = detail === MAYA.standby2;

    if (userCount >= MAYA_TARGET_PLAYERS) {
      return { subject, lines: [left ? T.ktLostControlLeft : T.ktLostControlRight] };
    }

    return {
      subject,
      lines: [
        formatText(left ? T.ktLostControlLeftCount : T.ktLostControlRightCount, userCount),
        formatText(T.ktMorePowerNeeded, MAYA_TARGET_PLAYERS - userCount),
      ],
    };
  }

  if (kanturuState === KanturuState.NightmareBattle) {
    return {
      subject: T.ktMayaOngoing,
      lines: [
        formatText(T.ktPlayersOpening, userCount),
        formatText(T.ktInBattleNightmare, userCount),
      ],
    };
  }

  if (kanturuState === KanturuState.Standby) {
    // STANBY_START: the countdown. Anything else: "shortly".
    const first =
      detail === 1
        ? formatText(T.ktNightmareInvaded, Math.floor(remainSeconds / 60))
        : T.ktApproachShortly;
    return {
      subject: T.ktBossBattleSoon,
      lines: [first, T.ktDefeatNightmare, T.ktMoonstoneRequired],
    };
  }

  return { subject: T.ktFailedToEnter, lines: [] };
}

/** The entry dialog: whether it is up and the lines it draws. */
export function kanturuDialog(): KanturuDialog {
  const { subject, lines } = dialogText(
    state.state,
    state.detail,
    state.userCount,
    state.remainSeconds,
    state.canEnter
  );
  return { open: state.open, subject, lines, canEnter: state.canEnter };
}

/** `CNewUIKanturuInfoWindow`: the counts and the clock, on the event map. */
export function kanturuHud(): KanturuHud {
  return {
    open: state.hudOpen,
    userCount: state.userCount,
    monsterCount: state.monsterCount,
    boss:
      state.hudDetail === MAYA.maya1 ||
      state.hudDetail === MAYA.maya2 ||
      state.hudDetail === MAYA.maya3,
    seconds: Math.max(0, Math.ceil(state.seconds)),
  };
}

/** `RenderKanturu3rdResultInterface`: won / lost, and how faded in it is. */
export function kanturuResult(): { won: boolean; alpha: number } | null {
  if (state.result === null) return null;
  return { won: state.result, alpha: state.resultAlpha };
}

export function closeKanturu(): void {
  runInAction(() => {
    state.open = false;
  });
}

/** The Refresh button (`SendRequestKanturu3rdInfo`). */
export function refreshKanturu(): void {
  if (Store.isOffline) return;
  Store.sendToGS(KanturuInfoRequestPacket.createPacket().buffer);
}

/**
 * The Enter button. The original plays the machine's animation first and
 * sends at frame 42 (`IsNpcAnimation`); the request itself is the same.
 */
export function enterKanturu(): void {
  if (!state.canEnter || Store.isOffline) return;
  const p = Store.playerData;
  startGatewayTurn({
    tower: state.state === KanturuState.Tower,
    helper: p.petSlot,
    wings: p.wingsSlot,
    ring1: p.ring1Slot,
    ring2: p.ring2Slot,
  });
  Store.sendToGS(KanturuEnterRequestPacket.createPacket().buffer);
}

// ---- packets ---------------------------------------------------------------

/** `ReceiveKanturu3rdInfo`: the answer to a talk, and to Refresh. */
EventBus.on('KanturuStateInfo', packet => {
  const p = new KanturuStateInfoPacket(packet);
  runInAction(() => {
    state.state = p.State;
    state.detail = p.DetailState;
    state.canEnter = p.CanEnter;
    state.userCount = p.UserCount;
    state.remainSeconds = p.RemainSeconds;
    state.open = true;
  });
});

/**
 * `ReceiveKanturu3rdEnter`: success needs no window - the warp follows and
 * closes it. A refusal is the original's `CreateMessageBox`, as a notice.
 */
EventBus.on('KanturuEnterResult', packet => {
  const p = new KanturuEnterResultPacket(packet);
  if (p.Result === EnterResult.Success) {
    closeKanturu();
    return;
  }
  Store.addNotification(EVENT_TEXT.ktFailedToEnter, 'error', MESSAGE_MS);
});

/** The cutscene `GetKanturuMayaState` / `GetKanturuNightmareState` start. */
function directionCue(
  next: KanturuState,
  detail: number
): DirectionCue | null {
  if (next === KanturuState.MayaBattle) {
    if (detail === MAYA.notify) return MAYA_RISES;
    if (detail === MAYA.endCycleMaya3) return MAYA_DIES;
  }
  if (next === KanturuState.NightmareBattle && detail === NIGHTMARE.nightmare) {
    return NIGHTMARE_SUMMONED;
  }
  return null;
}

/**
 * `ReceiveKanturu3rdState`: the figure is up during a monster wave, a Maya
 * hand or the Nightmare fight, and hidden for every standby and cutscene
 * in between.
 */
EventBus.on('KanturuStateChange', packet => {
  const p = new KanturuStateChangePacket(packet);
  // The generator gives each packet its own copy of the enum; this one is
  // the same `KANTURU_STATE_TYPE` by definition.
  const next = p.State as number as KanturuState;
  const detail = p.DetailState;

  const inWave =
    (next === KanturuState.MayaBattle &&
      (detail === MAYA.monster1 ||
        detail === MAYA.maya1 ||
        detail === MAYA.monster2 ||
        detail === MAYA.maya2 ||
        detail === MAYA.monster3 ||
        detail === MAYA.maya3)) ||
    (next === KanturuState.NightmareBattle && detail === NIGHTMARE.battle);

  // `CheckSuccessBattle` (GM_Kanturu_3rd.cpp:59-89): the barrier coming down
  // is heard once, inside the tower.
  if (Store.world?.mapIndex === EVENT_MAP) {
    const open =
      next === KanturuState.Tower &&
      (detail === TOWER.revitalization || detail === TOWER.notify);
    if (open && !towerOpen) {
      playSfx('Sound/w39/kan_boss_disfield', null, { channels: 1 });
    }
    towerOpen = open;

    // Any other pair cuts a cutscene short, as `ResetDirectionState` does.
    const phase = next * 256 + detail;
    if (phase !== lastPhase) {
      lastPhase = phase;
      cue = directionCue(next, detail);
      const pos = Store.world?.playerEntity?.transform?.pos;
      if (cue) {
        const tiles = pos ? Math.hypot(pos.x - cue.x, pos.z - cue.y) : 0;
        const frames = Math.ceil(tiles) + DIRECTION_FRAMES;
        cueDelay = frames / ORIGINAL_FPS + cue.wait;
      }
    }
  }

  runInAction(() => {
    state.hudState = next;
    state.hudDetail = detail;
    state.hudOpen = inWave;
    // A refused entry leaves the dialog up; a phase change makes its text
    // stale, so keep the pair the dialog reads in step as well.
    state.state = next;
    state.detail = detail;
  });
});

/** `Kanturu3rdUserandMonsterCount`. */
EventBus.on('KanturuMonsterUserCount', packet => {
  const p = new KanturuMonsterUserCountPacket(packet);
  runInAction(() => {
    state.monsterCount = p.MonsterCount;
    state.userCount = p.UserCount;
  });
});

/** `CNewUIKanturuInfoWindow::SetTime`: the phase clock, in milliseconds. */
EventBus.on('KanturuTimeLimit', packet => {
  const p = new KanturuTimeLimitPacket(packet);
  runInAction(() => {
    state.seconds = p.TimeLimitMilliseconds / 1000;
  });
});

/** `Kanturu3rdResult`: the 372x99 banner over the middle of the screen. */
EventBus.on('KanturuBattleResult', packet => {
  const p = new KanturuBattleResultPacket(packet);
  resultHeld = 0;
  runInAction(() => {
    state.result = p.Result === BattleResult.Victory;
    state.resultAlpha = 0;
  });
});

/**
 * `MayaSceneMayaAction`: cosmetic. Storm is a single burst of debris thrown
 * up around the hero, Rain is four falls of stones a second apart.
 */
EventBus.on('KanturuMayaWideAreaAttack', packet => {
  const p = new KanturuMayaWideAreaAttackPacket(packet);
  if (p.Type === MayaAttack.Rain) {
    rainLeft = RAIN_BURSTS;
    rainDelay = 0;
    return;
  }
  mayaStorm();
});

// ---- the Maya attack visuals -----------------------------------------------

/** `MODEL_STONE1 + rand() % 2` and `MODEL_MAYASTONE1 + rand() % 3`. */
const STORM_CHIPS = [MODEL.stone, MODEL.stone2] as const;
const RAIN_STONES_MODELS = [MODEL.mayaStone, MODEL.mayaStone2, MODEL.mayaStone3] as const;

/**
 * `MayaAction` case 0: a hundred stone chips over a 20x20 spread of 90-unit
 * steps - 9 tiles either way - starting 5 to 10 tiles under the hero and
 * thrown up through him. Case 1: ten `MODEL_MAYASTONE` a burst, 3 to 13
 * tiles above and 8 either way, each trailing `MODEL_MAYASTONEFIRE`.
 */
const STORM_DEBRIS = 100;
const STORM_SPREAD = 9;
const STORM_DROP = [5, 10] as const;
const STORM_RISE = 12;
const STORM_SECONDS = 1.2;
const RAIN_COUNT = 10;
const RAIN_SPREAD = 8;
const RAIN_HEIGHT = [3, 13] as const;
const RAIN_SCALE = [5, 8.3] as const;
const RAIN_FALL = -8;
const RAIN_SECONDS = 1.6;

function between(range: readonly [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** The chips thrown up around the hero. */
function mayaStorm(): void {
  const world = Store.world;
  const pos = world?.playerEntity?.transform?.pos;
  if (!world || !pos) return;
  // `SOUND_KANTURU_3RD_MAYA_STORM` (GM_Kanturu_3rd.cpp:1541), unpositioned.
  playSfx('Sound/w39/Maya_Storm', null, { bus: 'monsters', channels: 1 });
  for (let i = 0; i < STORM_DEBRIS; i++) {
    const at = new Vector3(
      pos.x + (Math.random() * 2 - 1) * STORM_SPREAD,
      pos.y - between(STORM_DROP),
      pos.z + (Math.random() * 2 - 1) * STORM_SPREAD
    );
    effects.spawn('model', world.scene, at, {
      model: pick(STORM_CHIPS),
      seconds: STORM_SECONDS,
      rise: STORM_RISE,
      spin: Math.random() * 6,
    });
  }
}

/** One fall of the stone rain. */
function mayaRain(): void {
  const world = Store.world;
  const pos = world?.playerEntity?.transform?.pos;
  if (!world || !pos) return;
  for (let i = 0; i < RAIN_COUNT; i++) {
    const at = new Vector3(
      pos.x + (Math.random() * 2 - 1) * RAIN_SPREAD,
      pos.y + between(RAIN_HEIGHT),
      pos.z + (Math.random() * 2 - 1) * RAIN_SPREAD
    );
    const scale = between(RAIN_SCALE);
    effects.spawn('model', world.scene, at, {
      model: pick(RAIN_STONES_MODELS),
      scale,
      seconds: RAIN_SECONDS,
      rise: RAIN_FALL,
      spin: Math.random() * 4,
    });
    effects.spawn('model', world.scene, at.clone(), {
      model: MODEL.mayaStoneFire,
      scale,
      seconds: RAIN_SECONDS,
      rise: RAIN_FALL,
    });
  }
}

// ---- the frame -------------------------------------------------------------

function update(map: ENUM_WORLD, dt: number): void {
  if (state.seconds > 0 && map === EVENT_MAP) {
    runInAction(() => {
      state.seconds = Math.max(0, state.seconds - dt);
    });
  }

  if (rainLeft > 0) {
    rainDelay -= dt;
    if (rainDelay <= 0) {
      mayaRain();
      rainLeft--;
      rainDelay = RAIN_INTERVAL;
    }
  }

  if (cue) {
    cueDelay -= dt;
    if (cueDelay <= 0) {
      playSfx(cue.key, null, { channels: 1 });
      cue = null;
    }
  }

  if (state.result === null) return;

  if (state.resultAlpha < 1) {
    runInAction(() => {
      state.resultAlpha = Math.min(1, state.resultAlpha + RESULT_FADE_PER_SECOND * dt);
    });
    return;
  }

  resultHeld += dt;
  if (resultHeld >= RESULT_HOLD_SECONDS) {
    runInAction(() => {
      state.result = null;
      state.resultAlpha = 0;
    });
  }
}

/**
 * `CNewUIKanturuInfoWindow::Update` hides the figure the moment the hero is
 * off the event map; a warp also ends the dialog and the banner.
 */
function reset(): void {
  rainLeft = 0;
  resultHeld = 0;
  towerOpen = false;
  lastPhase = -1;
  cue = null;
  runInAction(() => {
    state.open = false;
    state.hudOpen = false;
    state.seconds = 0;
    state.result = null;
    state.resultAlpha = 0;
  });
}

// ---- 3. the layer ----------------------------------------------------------

export const kanturuLayer: EventLayer = {
  name: 'kanturu',
  maps: MAPS,
  update,
  reset,
  state: () => ({ open: state.open, running: state.hudOpen }),
};
