# warp

Map changes and teleports: the `MapChanged` packet, the client-ready reply after a warp, the
Teleport / Teleport Ally rules, the loading-screen hold until the new map's objects arrive, and the
starred rows of the Move window, and the two requests that ask for a warp: `warpCommandRequest(index)`
(the Move window, `SendWarpCommandRequest` C1 8E 02) and `enterGateRequest(gate)` (a gate stepped on),
in `requests.ts`, through `index.ts` (the door).

## Public API
- `warpCommandRequest(index)`, `enterGateRequest(gate)` (`requests.ts`, through `index.ts`, the door):
  the two warp requests (both mark the round-trip timer).
- `teleportGate`: the hero's `TeleportGate` (`begin`, `isPending`, `sinceMapChange`,
  `onMapChanged`, `reset`). Tells the server's late same-map answer apart from a refusal.
- `teleportRefusal(check)`: why the server would refuse a Teleport, or null.
- `teleportSquareOpen(flag)`, `pickAllySquare(caster, flagAt)`, `aimAlongFacing(...)`,
  `TELEPORT_PREVENTING_EFFECTS`, type `Tile`.
- `WarpFavourites`: `has(index)`, `toggle(index)`, `count`. Starred `MoveReq_eng.bmd` rows, kept
  in local storage only.

## How it works
- `MapChanged` with `IsMapChange`: closes the NPC shop, notices, slide help and minimap
  (`ReceiveMapChange`, `WSclient.cpp:622`), clears the soccer board off the stadium, turns the hero
  to byte 9 (arrival facing) and emits `requestWarp`. The terrain loader then emits `warpCompleted`.
- On `warpCompleted` after such a warp it sends `ClientReadyAfterMapChange` (C1 04 F3 12). OpenMU
  parks the hero until it gets it, so no NPC or monster would enter scope otherwise. It also snaps
  every net object of the new map to the terrain height.
- `warpScopeHold.ts` holds the loading screen (`setSceneHold('warpScope')`) from the ready packet
  until the first scope packet lands plus 250 ms, or 2 s on an empty map.
- Same-map `MapChanged`: `teleportGate.onMapChanged` returns `confirm` (the answer to the hero's
  own teleport, about 1.8 s late; nothing moves unless he was knocked off) or `refused` / `unasked`
  (put back on the square and stopped, `ReceiveTeleport` Flag 0, `WSclient.cpp:2193-2197`).
- `teleportRules.ts` is Store-free. Refusal order: safe zone, effects (Stone, Stun, Sleep, Freeze2,
  Earth Binds), held item, pending teleport, 3 s after a map change (`ClassAttack.cpp:1524`),
  square range, blocked square (`ClassAttack.cpp:1516-1519` plus OpenMU's walk map). Teleport Ally
  picks a random open square of the eight around the caster (`ClassAttack.cpp:1437-1467`).
- Dev seams on `warpCompleted` in offline mode: `?offline&npcs=`, `?offline&buffs=`,
  `?offline&quickItems=` (see the comments in `net.ts`).

## Packets
- `MapChanged`: warp or same-map move of the hero.
- `warpCompleted` (bus event): sends `ClientReadyAfterMapChange`, re-snaps objects, dev seams.
- `requestWarp`, `wsClosed` (bus events): release the scope hold.
- Scope packets (`AddNpcsToScope` and the character / summon adds): end the scope hold.

## Depends on / used by
- uses: `app/store.ts`, `ecs/systems/teleportSystem` (`cancelTeleport`, `endTeleport`),
  `_shared/net_helpers.ts`, `skills/skillCasting` (`TELEPORT`), `chat/notices`, `social`
  (`battleSoccer`), `economy`, `inventory/quickItemActions`, `controllers/loading/sceneGate`.
- used by: `src/app/logic.ts`, `ecs/systems/skillCastSystem.ts`, `playerControllerSystem.ts`,
  `teleportSystem.ts`, `versions/shared/ui/hud/mobile_controls/skillPad.tsx`,
  `versions/shared/ui/windows/move_command_window/` (`WarpFavourites`).

## Change it
- change what a warp closes or resets: the `IsMapChange` branch in `net.ts`.
- change when Teleport is allowed: `teleportRefusal` in `teleportRules.ts` (add a test case).
- change the loading hold timing: `WAIT_MS`, `SETTLE_MS` in `warpScopeHold.ts`.
- add a dev seam: another `warpCompleted` handler in `net.ts`, offline only.

## Tests
- `teleportRules.test.ts`: `TeleportGate` verdicts and timeout, `teleportRefusal` cases,
  `pickAllySquare`, `aimAlongFacing`.
