# world

Map-wide packets that are not owned by another module: weather, the medal fanfare and the
object effects (level-up beam, shield potion, shield lost, swirl). Weather state lives in the
central `Store` (`Store.weather`).

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- `WeatherStatusUpdate` writes `{ weather, variation }` into `Store.weather`;
  `controllers/weather/rainState.ts` reads it. Each change is logged; rain with intensity 0
  (`RainTarget = (Value & 15) * 6` is zero, so the original shows no rain) is logged once per
  session as clear.
- Object effects go through `emitObjectEffect(netId, effect)` from `src/app/logic.ts`, which emits
  the `objectEffect` bus event for `ecs/systems/objectEffectSystem.ts` (the level-up sound rides
  that burst).
- Shield lost also plays `Sound/shieldclash` at the target, except in Chaos Castle
  (`ReceiveDisplayEffectViewport`, `WSclient.cpp:9662-9668`).
- The `fanfare` bus event is emitted by `routeServerCommand` in `src/app/logic.ts`, which owns the
  shared F3 40 packet. Effect type 2 is SOUND_MEDAL (`ReceiveServerCommand`, `WSclient.cpp:8359-8360`).

## Packets
- `WeatherStatusUpdate`: weather kind and variation of the current map.
- `ShowEffect` (C1 48): level-up, shield potion, shield lost.
- `ShowSwirl` (C1 67): swirl effect on the target.
- `fanfare` (bus event): plays `Sound/eMedal`.

## Depends on / used by
- uses: `app/store.ts`, `app/logic.ts` (`emitObjectEffect`), `controllers/sound`,
  `controllers/weather/rainState`, `controllers/actors/locomotion` (`inChaosCastle`).
- used by: `src/app/logic.ts`.

## Change it
- change how weather is read or logged: the `WeatherStatusUpdate` handler in `net.ts`; the rain
  itself is `controllers/weather/`.
- add a `ShowEffect` case: add it to the switch in `net.ts` and the effect name to
  `Events['objectEffect']` (`core/eventBus/events`).
- other F3 40 server commands (fireworks, swirl with sound, message boxes): `src/app/logic.ts`.

## Tests
- none yet.
