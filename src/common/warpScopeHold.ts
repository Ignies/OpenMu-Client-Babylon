import { EventBus } from '../libs/eventBus';
import { setSceneHold } from './sceneGate';

/**
 * After a warp OpenMU parks the hero until `ClientReadyAfterMapChange`, so
 * the new map's NPCs, monsters and players only start arriving a round trip
 * after the map itself is in - which is when the loading screen used to lift,
 * and they popped in on the open scene. The gate is held from the ready
 * packet until the first of them lands (plus a moment for the rest of the
 * burst), or until `WAIT_MS` for a map that has nobody on it.
 */
const HOLD = 'warpScope';
const WAIT_MS = 2000;
const SETTLE_MS = 250;

const SCOPE_PACKETS = [
  'AddNpcsToScope',
  'AddSummonedMonstersToScope',
  'AddCharactersToScope',
  'AddCharacterToScopeExtended',
  'AddTransformedCharactersToScope',
] as const;

let held = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function release(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  held = false;
  setSceneHold(HOLD, false);
}

function releaseIn(ms: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(release, ms);
}

/** Called when the ready packet goes out. */
export function holdForWarpScope(): void {
  held = true;
  setSceneHold(HOLD, true);
  releaseIn(WAIT_MS);
}

for (const name of SCOPE_PACKETS) {
  EventBus.on(name as never, () => {
    if (held) releaseIn(SETTLE_MS);
  });
}

EventBus.on('requestWarp', release);
EventBus.on('wsClosed', release);
