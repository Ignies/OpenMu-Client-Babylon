# improvements

The deliberate improvements over the original client, one file each (`defineImprovement`, from
`src/controllers/fidelity`). The Options window's Fidelity page lists them; the code that deviates
asks `isOn('<id>')`. Classic turns them all off and runs the original.

## Public API
- each `<id_in_snake_case>.ts`: `export default defineImprovement({ id, preset, labelKey, hintKey })`.
- `all.ts`: finds every file here by glob (a disk walk under Bun) and registers them. Imported by
  each version's core module (`versions/<id>/index.ts`), so tests have them too.
- `i18n/<code>.ts`: the labels and hints (`fidelity.<id>`, `fidelity.<id>.hint`), in every language.

## How it works
| id | preset | site | Classic (the original) |
|---|---|---|---|
| `otherPlayersOwnSpeed` | Enhanced | `ecs/systems/animationSystem.ts` | every player at the hero's speeds (ZzzCharacter.cpp:812-1028) |
| `masterBuffCancel` | Enhanced | `controllers/skills/index.ts` (`cancelledEffects`) | skill ids 256+ cancel nothing (BYTE, WSclient.cpp:3884) |
| `archangelFeathers` | Enhanced | `monsters/_archangels/model.ts` | no feathers, 2.7-tile halo on the NPC (ZzzCharacter.cpp:8695-8708) |
| `loginChandeliers` | Enhanced | `maps/loginscene/create.ts` | cold chandeliers (GMEmpireGuardian4.cpp:1050-1053) |
| `torchCrackle` | Enhanced | `controllers/sound/crackle.ts` | torches are silent (no `SOUND_FIRE`) |
| `loginWallTorches` | Enhanced | `maps/loginscene/wallTorchObject.ts` | the login wall torch is its grey flare alone (GMEmpireGuardian4.cpp:864-875); Enhanced burns it with a warm one |
| `fortressLights` | Enhanced | `maps/empireguardian4/spec.ts`, `maps/empireguardian/spec.ts` | day-4 wall torches (a grey flare), chandeliers and braziers (79 and 80, also the login scene's and days 1-3's; 79's flare steady) light no ground (no `AddTerrainLight` in cases 37, 79, 80, 157) |
| `lampFlares` | Enhanced | the `spec.ts` rows of `maps/lorencia` (90, 150), `devias` (66, the candelabra light), `elbeland` (61), `losttower` (18, 19, 20, 23), `vulcanus` (6, also Doppelganger 2's), `lorenmarket` (57), `noria` (39), `stadium` (9), `landoftrials` (42), `kanturu1` (60, also the GM area's and Doppelganger 4's); `maps/lorencia/candleObject.ts`, `maps/devias/candleObject.ts`, `maps/bloodcastle/candelabraObject.ts`, `maps/stadium/brazierObject.ts` | those lamps, candles, hearths and braziers have no flare, only their light; the candle wicks and the Land of Trials, Kanturu deep-red (60) and Stadium braziers do not burn; the Devias candelabra, the Lost Tower lamps, machines and braziers, the fire vents, the Noria forge, the Stadium braziers and the Blood Castle candelabra light no ground; Lorencia 90 and 150 and Elbeland 61 light linearly at the object (ZzzObject.cpp:2853-2912, :2939-2946, :3161-3175, :3781-3785, :3810-3814, :3874-3876, :3923-3985, :4658-4660; GMHuntingGround.cpp:101-108; GM_Kanturu_1st.cpp:71-77; GMNewTown.cpp:135-140; GM_PK_Field.cpp:252-264; GMDoppelGanger2.cpp:62-72; GMUnitedMarketPlace.cpp:128-136) |
| `roofFade` | Enhanced | `ecs/systems/ceilingHideSystem.ts` | roofs stay drawn (the only object fade is Chaos Castle's) |
| `requestTimeout` | Enhanced | `modules/social/requestTimeout.ts`, wired by `party/net.ts`, `trade/net.ts`, `events/duel.ts` | a trade, party or duel prompt stays until clicked |
| `cameraKeepsView` | Enhanced | `controllers/camera/index.ts` (`warpCompleted`, `cameraView`), `ui/hud/camera_reset` | every world change resets the camera level, heading and tilt (WSclient.cpp:600); no reset button |
| `swingFill` | Enhanced | `ecs/systems/attackSystem.ts` (sets `playerAnimation.swingFill` at the blow), `animationSystem.ts` (applies it) | the swing clip plays at the attack speed's rate to its end and the hero stands until the next swing (ZzzCharacter.cpp:812); the blow and the hit request keep their time either way |
| `noticeLinks` | Enhanced | `modules/chat/notices.ts` (`create`), `ui/hud/notices/index.tsx` | a notice is plain text, markup and all, cut in two past 256 px (ZzzInterface.cpp:491-603) |
| `drawnClothShadows` | Enhanced | `controllers/cloth/clothSet.ts` (`runClothFrame`) | every built cloth below `m_byNumCloth` lays its shadow, a skipped one where it was left (ZzzBMD.cpp:2648-2710) |

- The file's comment cites the original and names the site; the site keeps the original path when
  `isOn` is false.
- Never an improvement: anything that changes what the server sees. Holding the hit request until
  the blow lands is a server setting (`heldHitRequest` in the world's `server.json`,
  `src/modules/servers/serverManifest.ts`), not a player choice.
- Some deviations read at build time: `loginChandeliers` when
  the login scene loads, `loginWallTorches` and `fortressLights` when a torch, chandelier or brazier
  lights, `lampFlares` when a lamp's flare, light or wick fire is made.
- `roofFade` only turns the fade off: `ecs/systems/roofDetection.ts` still finds the roof over the
  hero on Classic, because the weather and the indoor ambience read it.

## Depends on / used by
- uses: `src/controllers/fidelity`.
- used by: the version core modules (registration), the Options window (labels).

## Change it
- add one: [docs/how_to/add_improvement.md](../../../docs/how_to/add_improvement.md).
- remove one: delete its file, its `isOn` reads and its text. A stored override for it is ignored.

## Tests
- `improvements.test.ts`: each file registers an id named after it, has its English text, is read
  by an `isOn('<id>')` somewhere and every such read names a registered id; Enhanced keeps them all
  on, Classic turns them off; `cancelledEffects` on Classic and Enhanced; the `fortressLights` hint
  names the braziers it switches in every language.
- `maps/loginscene/create.test.ts`: the chandeliers stay cold on Classic.
- `maps/loginscene/wallTorchObject.test.ts`, `maps/empireguardian4/spec.test.ts`,
  `ecs/systems/ceilingHideSystem.test.ts`: the torch is its grey flare, the fortress lights are off and
  the roof stays drawn (still detected) on Classic.
- `maps/lampFlares.test.ts`, `maps/lorencia/candleObject.test.ts`, `maps/devias/candleObject.test.ts`,
  `maps/bloodcastle/candelabraObject.test.ts`, `maps/stadium/brazierObject.test.ts`: the flares,
  fires and ground lights the original never draws are gone on Classic, the original's light under
  them stays.
- `controllers/cloth/clothSet.test.ts`: on Classic a built cloth the loop skips lays its shadow where it was
  left; `drawnClothShadows` leaves it out and keeps the drawn cloth's.
