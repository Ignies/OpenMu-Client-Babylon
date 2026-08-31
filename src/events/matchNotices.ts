import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { Notices } from '../common/notices';
import {
  MapEventStateEventsEnum,
  MapEventStatePacket,
  UpdateMiniGameStateMiniGameTypeStateEnum,
  UpdateMiniGameStatePacket,
} from '../common/packets/ServerToClientPackets';
import type { EventLayer } from './layer';
import { EVENT_TEXT, formatText } from './recipes';

/**
 * The lines every event shares: the 30-second state countdown
 * (`CSBaseMatch::StartMatchCountDown` / `RenderTime`, CSEventMatch.cpp —
 * "%s Closing (in %d seconds)" at the bottom of the screen) and the map
 * invasion banners (`MapEventState`: Red / Golden Dragon).
 *
 * Driven by: `UpdateMiniGameState` (0x92, `ReceiveDevilSquareCountDown`)
 * and `MapEventState`. Read by: `EventCountdown` in
 * `ui/pages/worldPage/components/events` through `matchCountdownLine()`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** `kMatchCountdownDuration`: the line runs this long, then vanishes. */
const COUNTDOWN_SECONDS = 30;

/**
 * `RenderTime`: which `GlobalText` line each 0x92 state maps to. The
 * original's `StartMatchCountDown(Value + 1)` reads value 0..2 as
 * `TYPE_MATCH_DEVIL_ENTER_START/ENTER_CLOSE/CLOSE` (640..642), 3..6 as
 * `TYPE_MATCH_CASTLE_ENTER_CLOSE/INFILTRATION/CLOSE/END` (824..827) and
 * 10..13 as the Chaos Castle four (824, 828, 826, 827). Devil Square lines
 * take one `%d`; the castle lines take the zone name and the `%d`.
 *
 * What the server *means* by a value differs from the original's table
 * for the castles: OpenMU (`MiniGameContext.RunGameAsync`) only ever sends
 * `Closed` (3 / 10) - and it does so *after* `CloseEntranceAsync`, 30 s
 * before `StartAsync` - and `Ended` (6 / 13) 30 s before the shutdown
 * warp. The original's 824 "%s Closing" belongs to the last 30 s the gate
 * is still open; when 3 arrives from OpenMU the gate is already shut and
 * everyone is inside waiting for the assault, which is the original's 825
 * "Infiltration" / 828 "Penetration" moment (Devil Square's 0 → 640 "You
 * will enter … (N seconds from now)" already says exactly that). So
 * `Closed` prints the start line and `Opened` - never sent by OpenMU, but
 * the original's "gate closes in N" if a server ever does - the closing one.
 */
const COUNTDOWN_TEXT: Readonly<
  Record<number, { template: string; zone?: string }>
> = {
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareClosed]: {
    template: EVENT_TEXT.devilEnterStart,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareOpened]: {
    template: EVENT_TEXT.devilEnterClose,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareRunning]: {
    template: EVENT_TEXT.devilClose,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleClosed]: {
    template: EVENT_TEXT.zoneInfiltration,
    zone: EVENT_TEXT.bloodCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleOpened]: {
    template: EVENT_TEXT.zoneClosing,
    zone: EVENT_TEXT.bloodCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleEnding]: {
    template: EVENT_TEXT.zoneEventEnds,
    zone: EVENT_TEXT.bloodCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleFinished]: {
    template: EVENT_TEXT.zoneShutsDown,
    zone: EVENT_TEXT.bloodCastleZone,
  },
  // `TYPE_MATCH_CHAOS_EINFILTRATION` is redirected 825 → 828 by RenderTime.
  [UpdateMiniGameStateMiniGameTypeStateEnum.ChaosCastleClosed]: {
    template: EVENT_TEXT.zonePenetration,
    zone: EVENT_TEXT.chaosCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.ChaosCastleOpened]: {
    template: EVENT_TEXT.zoneClosing,
    zone: EVENT_TEXT.chaosCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.ChaosCastleEnding]: {
    template: EVENT_TEXT.zoneEventEnds,
    zone: EVENT_TEXT.chaosCastleZone,
  },
  [UpdateMiniGameStateMiniGameTypeStateEnum.ChaosCastleFinished]: {
    template: EVENT_TEXT.zoneShutsDown,
    zone: EVENT_TEXT.chaosCastleZone,
  },
};

/**
 * Ours: OpenMU's `MapEventState` has no text of its own in the original
 * (it only lit the dragon effects), so the banner wording is the clone's.
 */
const MAP_EVENT_TEXT: Readonly<Record<number, string>> = {
  [MapEventStateEventsEnum.RedDragon]: 'The Red Dragon is invading!',
  [MapEventStateEventsEnum.GoldenDragon]: 'The Golden Dragon is invading!',
};

// ---- 2. state + readers ----------------------------------------------------

const state = observable(
  {
    template: null as { template: string; zone?: string } | null,
    /** Seconds left of the 30; whole seconds are what the line prints. */
    left: 0,
  },
  {},
  { deep: false }
);

/** The countdown line to draw, or null when none is running. */
export function matchCountdownLine(): string | null {
  const t = state.template;
  if (!t || state.left <= 0) return null;
  const seconds = Math.ceil(state.left);
  return t.zone
    ? formatText(t.template, t.zone, seconds)
    : formatText(t.template, seconds);
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (!state.template) return;
  runInAction(() => {
    state.left = Math.max(0, state.left - dt);
    if (state.left === 0) state.template = null;
  });
}

function reset(): void {
  // The countdown is global — a warp into the event must not eat it — so
  // only a finished line is dropped here.
  if (state.left <= 0) {
    runInAction(() => {
      state.template = null;
    });
  }
}

// ---- packets ---------------------------------------------------------------

EventBus.on('UpdateMiniGameState', packet => {
  const p = new UpdateMiniGameStatePacket(packet);
  const text = COUNTDOWN_TEXT[p.State];
  if (!text) return;
  runInAction(() => {
    state.template = text;
    state.left = COUNTDOWN_SECONDS;
  });
});

EventBus.on('MapEventState', packet => {
  const p = new MapEventStatePacket(packet);
  const text = MAP_EVENT_TEXT[p.Event];
  if (p.Enable && text) Notices.create(text);
});

// ---- 3. the layer ----------------------------------------------------------

export const matchNoticesLayer: EventLayer = {
  name: 'matchNotices',
  update,
  reset,
  state: () => ({ open: false, running: state.template !== null }),
};
