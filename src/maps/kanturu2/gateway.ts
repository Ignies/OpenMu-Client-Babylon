import type { Sound } from '@babylonjs/core/Audio/sound';
import type { Item } from '../../ecs/world';
import { EventBus } from '../../libs/eventBus';
import { SoundsManager } from '../../libs/soundsManager';
import type { Sounds } from '../../sound/recipes';
import {
  DARK_HORSE,
  HORN_OF_DINORANT,
  HORN_OF_FENRIR,
  HORN_OF_UNIRIA,
} from '../../common/petConstants';
import {
  CAPE_OF_LORD,
  HELPER_GROUP,
  WING_GROUP,
  WING_OF_DIMENSION,
  WING_OF_ELF,
  WING_OF_STORM,
  WINGS_OF_DARKNESS,
} from '../../common/wings';

// The Gateway Machine's turn re-issues the 1-channel, unpositioned
// kan_relic_hole every frame (GM_Kanturu_2nd.cpp:1125-1129, MapManager.cpp:441)
// until the enter result (NewUIKanturuEvent.cpp:373-385) or clip frame 50
// (GM_Kanturu_2nd.cpp:1243-1249).

// ---- 1. tuning -------------------------------------------------------------

const HOLE: Sounds = 'Sound/w38/kan_relic_hole';

/** Mixer slot of the instance; no other loop plays this key. */
const SLOT = 0;

/** Frame 50 of the turn clip at the NPC `PlaySpeed` 0.25 (ZzzOpenData.cpp:2233), 25 fps. */
export const GATEWAY_TURN_MS = (50 / 0.25 / 25) * 1000;

/** Helper rings `CheckChangeRing` refuses (ChangeRingManager.cpp:51-55). */
const CHANGE_RINGS: ReadonlySet<number> = new Set([
  10, 39, 40, 41, 42, 68, 76, 122,
]);
const MOONSTONE_PENDANT = 38;
/** `ITEM_CAPE_OF_FIGHTER`..`ITEM_CAPE_OF_OVERRULE`, `ITEM_WING + 130..135`. */
const CAPE_OF_FIGHTER = 49;
const CAPE_OF_OVERRULE = 50;
const SMALL_WINGS_FIRST = 130;
const SMALL_WINGS_LAST = 135;

// ---- 2. state --------------------------------------------------------------

/** The instance the last turn started, so the end never creates one. */
let hole: Sound | null = null;
let turnTimer: ReturnType<typeof setTimeout> | undefined;

/** What the Enter click reads: the event state and the hero's worn gear. */
export type GatewayGear = {
  /** `m_byState == KANTURU_STATE_TOWER`: it turns with no gear check. */
  readonly tower: boolean;
  readonly helper: Item | null | undefined;
  readonly wings: Item | null | undefined;
  readonly ring1: Item | null | undefined;
  readonly ring2: Item | null | undefined;
};

const isHelper = (i: Item | null | undefined, num: number): boolean =>
  !!i && i.group === HELPER_GROUP && i.num === num;

const isChangeRing = (i: Item | null | undefined): boolean =>
  !!i && i.group === HELPER_GROUP && CHANGE_RINGS.has(i.num);

function canFly(g: GatewayGear): boolean {
  const w = g.wings;
  if (w?.group === WING_GROUP) {
    const n = w.num;
    if (
      (n >= WING_OF_ELF && n <= WINGS_OF_DARKNESS) ||
      (n >= WING_OF_STORM && n <= WING_OF_DIMENSION) ||
      (n >= CAPE_OF_FIGHTER && n <= CAPE_OF_OVERRULE) ||
      (n >= SMALL_WINGS_FIRST && n <= SMALL_WINGS_LAST)
    )
      return true;
  }
  return (
    isHelper(w, CAPE_OF_LORD) ||
    isHelper(g.helper, HORN_OF_DINORANT) ||
    isHelper(g.helper, DARK_HORSE) ||
    isHelper(g.helper, HORN_OF_FENRIR)
  );
}

/**
 * Whether the Enter click turns the machine (NewUIKanturuEvent.cpp:470-516);
 * every refusal there is a message box and no turn, so no sound.
 */
export function gatewayTurns(g: GatewayGear): boolean {
  if (g.tower) return true;
  if (isHelper(g.helper, HORN_OF_UNIRIA)) return false;
  if (isChangeRing(g.ring1) || isChangeRing(g.ring2)) return false;
  if (!canFly(g)) return false;
  return (
    isHelper(g.ring1, MOONSTONE_PENDANT) || isHelper(g.ring2, MOONSTONE_PENDANT)
  );
}

/**
 * The Enter click. The machine turns only where the original sets ROT; a click
 * while it still turns keeps the one instance looping, never a second copy.
 */
export function startGatewayTurn(gear: GatewayGear): void {
  if (!gatewayTurns(gear)) return;
  const s = SoundsManager.loopInstance(HOLE, SLOT);
  if (!s) return;
  hole = s;

  clearTimeout(turnTimer);
  turnTimer = setTimeout(endGatewayTurn, GATEWAY_TURN_MS);

  s.loop = true;
  // Not decoded yet on the first turn: it starts once it is.
  s.autoplay = true;
  if (!s.isPlaying) s.play();
}

/** The turn is over: no more repeats, the copy sounding now runs to its end. */
export function endGatewayTurn(): void {
  clearTimeout(turnTimer);
  turnTimer = undefined;
  if (hole) hole.loop = false;
}

// OpenMU never sends 0xD1/0x01 (KanturuEnterRequestHandlerPlugIn.cs:20-22):
// there the warp's map reset or the frame-50 timer ends the turn.
EventBus.on('KanturuEnterResult', endGatewayTurn);
