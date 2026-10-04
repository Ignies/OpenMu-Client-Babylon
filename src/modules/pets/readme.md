# pets

The Dark Raven / Dark Horse info packets and the raven's commands. Pet info and raven mode state,
and the pet requests, live in the central `Store` (`src/app/store.ts`). What each pet looks like
and how it is drawn is the pets controller (`src/controllers/pets`); the pet item numbers are
`versions/shared/items/petItems.ts`.

## Public API
- none for packets. `installNet()` in `net.ts` registers its handlers (`module.ts`).

## How it works
- `net.ts` stores pet info for the tooltip and the raven's command mode in the Store
  (`setPetInfo`, `setPetMode` -> `petInfo`, `petInfoByPet`, `petMode`), and plays the raven's
  attack sound at its owner (`CSPetSystem::SetAttack`).
- Outgoing packets are Store actions: `requestPetInfo` (`SendPetInfoRequest`,
  `ZzzInventory.cpp:2116`) and `sendPetCommand`.
- Dependency direction: the pet specs (`pets.ts`) became `controllers/pets` because the player rig,
  the weapon clips and the combat clips read them, and a controller may not import a module; the
  item numbers (`petConstants.ts`) became `versions/shared/items/petItems.ts`, pure data the item
  serializer, the actors and the maps share.

## Packets
- `PetInfoResponse` (A9, `ReceivePetInfo`): level, experience, health of a raven or horse.
- `PetMode` (A7, `ReceivePetCommand`): the raven's command mode and target.
- `PetAttack` (A8): raven attack; sound only (`Sound/DSpirit_Missile` or `Sound/DSpirit_Rush`).

## Depends on / used by
- uses: `app/store.ts`, `controllers/sound`.
- used by: `src/app/logic.ts` (net).

## Change it
- handle a new pet packet: `net.ts`, state in the Store.
- add a pet or change a pet's look: `src/controllers/pets` (see its readme).

## Tests
- none yet.
