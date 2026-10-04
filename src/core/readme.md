# core

Small helpers every other folder may use: shared enums, math, the event bus, local storage,
pathfinding. Nothing here knows about a skill, a window or a map.

## Public API
- `types.ts`: `ENUM_WORLD` (map ids), `PlayerClass`, `CharacterClassNumber`, `IsCharacterFemale`, `BaseClass` and
  `getBaseClass` (a class number's first-tier class; `modules/hero/characterStats.ts` re-exports them).
- `EventBus` (`eventBus/index.ts`): the global `mitt` bus. `eventBus/events.ts` types every event:
  one per connect-server and game-server packet name (payload `DataView`) plus client events
  (`wsOpened`, `requestWarp`, `objectEffect`, ...).
- `createPathfinding({ width, height })` (`pathfinding.ts`): a tile grid over `astar.ts` with
  `search`, `posToIndex`, `applyClosedPatch` and string save / load. Used by `ecs/world.ts`.
- `createAttributeSystem()` (`attributeSystem.ts`): the per-entity stat bag (health, mana, speeds,
  `inSafeZone`, `weaponsOnBack`, ...).
- `turnAngle.ts`: `normalizeAngle`, `signedAngleDelta`, `turnAngle`, `approachAngle`,
  `createAngleDeg`, `rotationByteOf`, from `ZzzAI.cpp` (`TurnAngle2`, `CreateAngle`, ...).
- `binaryUtils.ts`: byte helpers (`castToByte`, `ArrayCopy`, `GetByteValue`, ...).
- `devQuery`, `devQueryNumber`, `devVitalPercent` (`devSeams.ts`): URL seams, `null` outside dev.
- `LocalStorage` (`localStorage.ts`): `localStorage` access that never throws.
- `Rand` (`rand.ts`), `MathUtils.AngleQuaternion` (`mathUtils.ts`), `wait` (`utils.ts`).
- `BurstLimit`, `clientIp`, `bucketFor`, `isLoopback` (`rateLimit.ts`): request limits for the bun
  services (`register/`, `cashshop/`, `marketplace/`), not the client.

## How it works
- `astar.ts` is javascript-astar 0.4.1 (MIT) changed for the MU grid (8-connected 256x256 tiles,
  the original's `PathFinding2`):
  - the default heuristic is octile; manhattan over-estimated and made the hero zig-zag.
  - a diagonal step is allowed when its destination tile is walkable, even if both tiles it cuts
    past are blocked. The original and the server check only the destination, and some maps
    cross a chasm through one such pinch (the Elbeland rope bridges).
  - the search stops after `maxExpansions` closed nodes and returns the path to the closest node
    seen, so a click into a walled-off area stays cheap and still walks toward it.
- `turnAngle.ts`: the original runs these once per 25 Hz tick (`REFERENCE_TICK`);
  `approachAngle` turns the per-tick fraction into a frame-rate independent step.
- `binaryUtils.ts` has no Babylon or DOM import so the terrain worker and the generated packet
  modules can use it without pulling the engine. `controllers/assets/download.ts` re-exports it.
- `rateLimit.ts`: shared so the services never disagree; IPv6 is counted per /64. Caddy appends
  to `X-Forwarded-For`, so `clientIp` takes the last entry (everything before it is the client's
  own), and only when the socket peer is loopback (Caddy on the same box) or listed in
  `TRUSTED_PROXIES` (Caddy in its own container, see install/). Any other peer reached
  the port directly, so its socket address is used.
- `eventBus/index.ts` declines hot updates so Vite never makes a second bus.

## Depends on / used by
- uses: `mitt`, `nanoid`. Type-only or Babylon imports in `eventBus/events.ts`, `mathUtils.ts`
  and `pathfinding.ts` break the `core-is-standalone` rule; they are listed in
  `tools/checks/baselines/deps.json` and may only shrink.
- used by: everything (`types.ts` and `EventBus` most).

## Change it
- add a client event: add its name and payload type to `Events` in `eventBus/events.ts`.
- add a map id: `ENUM_WORLD` in `types.ts` (the map itself is content, see
  [../../docs/content.md](../../docs/content.md)).
- change how the hero paths: `astar.ts` (search) or `pathfinding.ts` (grid); keep
  `pathfinding.test.ts` green.
- keep new files here free of game imports (`tools/checks/rules.ts`).

## Tests
- `pathfinding.test.ts`: the Elbeland bridge pinch (a diagonal past two blocked tiles is walkable)
  and a closed tile is never walked onto.
- `rateLimit.test.ts`: IP buckets (IPv4, mapped IPv4, IPv6 /64), loopback, the forwarded header
  trusted only from Caddy on this box, the burst window.
