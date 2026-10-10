# mu_helper

The MU Helper (auto hunt): its config codec, the settings window's state, the automation loop and
the two server packets, with its running state and the raw config blob (`MuHelper`).

## Public API
- `updateMuHelperLoop(world, dt)` (`loop.ts`): one frame of the loop, called by
  `src/ecs/systems/muHelperSystem.ts`. `resetMuHelperLoop()` drops its runtime state.
- `MuHelperState`, `toggleMuHelperWindow(open?)`, `resetMuHelperDraft()`, `saveMuHelperConfig()`,
  `ensureMuHelperWatching()` (`state.ts`): the live config, the window's draft and its buttons.
- `MuHelperConfig`, `DarkRavenMode`, `MAX_HUNTING_RANGE`, `MAX_OBTAINING_RANGE`, `MAX_EXTRA_ITEMS`,
  `MAX_EXTRA_ITEM_CHARS` (`config.ts`): what the window edits.

## How it works
- `MuHelper` (`state.ts`, through `index.ts`, the door): `active`, `lastMoneyConsumed`,
  `totalMoneyConsumed`, `config` blob), `setMuHelperStatus`, `setMuHelperConfig` and
  `toggleMuHelper()` (sends `MuHelperStatusChangeRequest`; refused in a safe zone; local flip offline).
- `config.ts` encodes and decodes the 257-byte blob. The layout is `PRECEIVE_MUHELPER_DATA`
  (`WSclient.h:3592-3642`) as `ConfigDataSerDe` (`MuHelperData.cpp`) writes it, so configs move
  between this client and the reference client.
- `state.ts` decodes `MuHelper.config` with a `reaction` into `MuHelperState.config`, and
  into `draft` while the window is closed. `saveMuHelperConfig` (`NewUIMuHelper.cpp:1095-1116`)
  applies the draft and sends `MuHelperSaveDataRequest`; the server echoes the config back.
- `loop.ts` ports `CMuHelper` (`MuHelper.cpp`). It runs only while `MuHelper.active` and the
  module is on (`moduleOn('mu_helper')`: a version's `modulesOff` or a world's turns it off, and then
  `toggleMuHelper` does nothing either). Every 250 ms (`Winmain.cpp:1282`) `work` does at most one of:
  pet command, buff, heal / drain life / potion, pick up, regroup, attack, then repair.
- It never builds packets. It writes the same seams as the player's clicks: `world.castRequest`,
  `world.pickupTarget`, `hero.playerMoveTo` and the commands a click calls (`HeroSkills.selectSkill`,
  `consumeItemRequest`, `repairItemRequest`, `Pets.sendPetCommand`).
- Entering a safe zone calls `MuHelper.toggleMuHelper()` (stop). A warp, or a jump of more than 3
  tiles, re-anchors the regroup point.
- Switching it off clears `world.castRequest`, `attackTarget` and `pickupTarget`, so the hero does not
  keep walking to the monster or drop it was on.

## Packets
- `MuHelperStatusUpdate` (BF 51): starts or pauses the helper; reports the zen it cost.
- `MuHelperConfigurationData` (C2 AE): the saved config blob, stored as is.
- outgoing: `MuHelperSaveDataRequest` (`state.ts`), `MuHelperStatusChangeRequest` (`MuHelper.toggleMuHelper`).

## Depends on / used by
- uses: `session`, `hero`, `skills`, `pets`, `inventory` (item use), `npc_shop` (repair),
  `social/social.ts` (`partyMembers` for party buffs and heals),
  `controllers/item_rules/itemStats.ts`, `core/inventoryConstants.ts`, `ecs/systems/attackSystem.ts`
  (`isAttackableEntity`), `versions/shared/skills/skillsDatabase`.
- used by: `src/app/logic.ts` (`net.ts`), `src/ecs/systems/muHelperSystem.ts` (`loop.ts`),
  `versions/shared/ui/windows/mu_helper/` (`config.ts`, `state.ts`). The Home key in
  `versions/shared/ui/hud/bottom_bar/` calls `MuHelper.toggleMuHelper()`.

## Change it
- a new config field: `MuHelperConfig`, `defaultMuHelperConfig`, `encodeMuHelperConfig` and
  `decodeMuHelperConfig` in `config.ts` (keep the reference byte layout), then the window.
- a new helper behaviour: a step in `work` in `loop.ts`, through an existing input seam.
- a buff the "already buffed" check should see: `BUFF_EFFECT_BY_NAME` in `loop.ts`.

## Tests
- `config.test.ts`: blob size, default layout, flag bits, round trips, zero blob, extra item names,
  away seconds clamp.
- `loop.test.ts`, `state.test.ts`: nothing runs or starts while the module is off. `loop.test.ts`: switching
  it off lets go of its cast, swing and pickup.
