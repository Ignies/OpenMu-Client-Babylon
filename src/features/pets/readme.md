# pets

The pet / mount slot (item group 13): which model each pet uses, how it is drawn (flying angel,
link-rendered imp, ridden mount, raven, follower pet), the Fenrir variants, and the Dark Raven /
Dark Horse info packets. Pet info and raven mode state, and the pet requests, live in the central
`Store` (`src/app/store.ts`).

## Public API
- item numbers (`petConstants.ts`, re-exported by `pets.ts`): `PET_GROUP`, `GUARDIAN_ANGEL`, `IMP`,
  `HORN_OF_UNIRIA`, `HORN_OF_DINORANT`, `DARK_HORSE`, `DARK_RAVEN`, `HORN_OF_FENRIR`, and the follower
  pets (`DEMON`, `SPIRIT_OF_GUARDIAN`, `PET_RUDOLF`, `PET_PANDA`, `PET_UNICORN`, `PET_SKELETON`).
- `petSpec(item)`: the `PetSpec` (kind, model, scale, follow motion, light, Fenrir look) or null.
- `isRidingMount(item)`: the slot holds a pet whose kind is `mount`.
- `mountKind(item, inSafeZone)`: `'uniria' | 'dinorant' | 'horse' | 'fenrir'` or null (on foot,
  also in a safe zone).
- `fenrirVariant(item)`, `fenrirShine(model, spec, casting)`, `fenrirMountAction(riderAction)`.
- `petFactoryFor(spec)`: a cached `ModelObject` class per pet model.
- `IMP_BONE`, `MOUNT_ACTION_*`, `FENRIR_ACTION_*`, types `PetSpec`, `PetFollow`, `MountKind`.

## How it works
- `PETS` in `pets.ts` maps item number to `PetSpec`. Fenrir is one item with four looks picked by
  its option bits (`GetFenrirType`, `ZzzCharacter.cpp:98-108`).
- `ecs/systems/petSystem.ts` spawns and moves the pets from these specs; `playerObject.ts` renders
  the imp on bone 34; `animationSystem.ts` and `skillClips.ts` pick rider clips from `mountKind`.
- `net.ts` stores pet info for the tooltip and the raven's command mode in the Store
  (`setPetInfo`, `setPetMode` -> `petInfo`, `petInfoByPet`, `petMode`), and plays the raven's
  attack sound at its owner (`CSPetSystem::SetAttack`).
- Outgoing packets are Store actions: `requestPetInfo` (`SendPetInfoRequest`,
  `ZzzInventory.cpp:2116`) and `sendPetCommand`.

## Packets
- `PetInfoResponse` (A9, `ReceivePetInfo`): level, experience, health of a raven or horse.
- `PetMode` (A7, `ReceivePetCommand`): the raven's command mode and target.
- `PetAttack` (A8): raven attack; sound only (`Sound/DSpirit_Missile` or `Sound/DSpirit_Rush`).

## Depends on / used by
- uses: `app/store.ts`, `controllers/render` (`ModelObject`), `controllers/assets/modelLoader`,
  `controllers/item_fx/itemEffectMode`, `controllers/sound`.
- used by: `src/app/logic.ts`, `ecs/systems/petSystem.ts`, `animationSystem.ts`, `attackSystem.ts`,
  `moveAlongPathSystem.ts`, `skillCastSystem.ts`, `characterSelectSystem.ts`, `combatSfxSystem.ts`,
  `ecs/world.ts`, `controllers/actors` (`playerObject`, `weaponClass`, `deserializeAppearance`),
  `controllers/combat/skillClips.ts`, `item_tooltip`, `items/itemSerializer.ts`, `combat/net.ts`,
  `_shared/net_helpers.ts`, `versions/shared/maps/kanturu2/gateway.ts`,
  `versions/shared/skills/common/plasma_storm`, `versions/shared/ui/hud/bottom_bar/petCommands.tsx`,
  `versions/shared/ui/windows/pet_info/`.

## Change it
- add a pet: its number in `petConstants.ts`, a `PetSpec` in `PETS` (`pets.ts`).
- change how a follower moves: its `follow` block in `PETS`; the motion code is `petSystem.ts`.
- change the Fenrir look: `FENRIRS` and `fenrirShine` in `pets.ts`.
- handle a new pet packet: `net.ts`, state in the Store.

## Tests
- none yet.

## Notes

### pets.ts
- `c->Helper` is the pet / mount slot of the appearance (group 13). The original splits it:
  - Guardian Angel (`MODEL_HELPER`) is a free-flying `Mounts[]` object with its own boid flight
    (`CreateMountSub` + `MoveMount`, `GOBoid.cpp:66-660`).
  - Imp is not a mount: it is link-rendered on the wearer's bone 34 every frame
    (`RenderCharacterBackItem`, `ZzzCharacter.cpp:15144-15180`) with a red light sprite.
  - Horn of Uniria / Dinorant are mounts pinned to the rider (same position and yaw, action 0
    standing, 2 moving, `GOBoid.cpp:494-556`). The rider uses the `*_RIDE` clips and floats 30 units
    up on a Dinorant (`MoveCharacterPosition`, `ZzzCharacter.cpp:6263-6273`).
- Models: `Data/Player/Helper0n.bmd` is `MODEL_HELPER + n` (`ZzzOpenData.cpp:705`) and
  `Data/Skill/Rider0n.bmd` the two mounts (`:3969-3970`), not the `Item/helper0n` icon models in
  items.json.
- Demon, Spirit of Guardian, Rudolph, Panda, Pet Unicorn and Pet Skeleton go through `CreatePet`
  instead of `CreateMount` (`ZzzCharacter.cpp:12992-12999`): one world object per pet that keeps
  station on its owner and is never ridden. See `PetFollow`.
