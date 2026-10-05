# pets

What each pet in the pet / mount slot (item group 13) looks like and how it is drawn: the flying
angel, the link-rendered imp, ridden mounts, the raven, follower pets, the Fenrir variants. The
pets module (`src/modules/pets`) keeps the pet packets; the item numbers are
`versions/shared/items/petItems.ts`.

## Public API
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
- `ecs/systems/petSystem.ts` spawns and moves the pets from these specs; `actors/playerObject.ts`
  renders the imp on bone 34; `animationSystem.ts` and `combat/skillClips.ts` pick rider clips from
  `mountKind`.
- Dependency direction: this was `modules/pets/pets.ts`. The player rig, the weapon and combat clips
  read it and a controller may not import a module, so it became its own small controller. Its door
  imports only `assets` (`loadGLTF`), `render` (`ModelObject`) and `item_fx` (the effect mode), as the
  module file did, so nothing loads earlier than before.

## Depends on / used by
- uses: `controllers/render` (`ModelObject`), `controllers/assets` (`loadGLTF`), `controllers/item_fx`
  (`legacyItemEffectsOn`, `improvedItemEffectsOn`), `@versions/shared/items/petItems`.
- used by: `src/app/logic.ts`, `ecs/systems/petSystem.ts`, `animationSystem.ts`, `attackSystem.ts`,
  `moveAlongPathSystem.ts`, `skillCastSystem.ts`, `characterSelectSystem.ts`, `ecs/world.ts`,
  `controllers/actors` (`playerObject`, `weaponClass`), `controllers/combat/skillClips.ts`,
  `modules/combat/net.ts`, `modules/combat/clips.ts`, `versions/shared/skills/common/plasma_storm`.

## Change it
- add a pet: its number in `versions/shared/items/petItems.ts`, a `PetSpec` in `PETS` (`pets.ts`).
- change how a follower moves: its `follow` block in `PETS`; the motion code is `petSystem.ts`.
- change the Fenrir look: `FENRIRS` and `fenrirShine` in `pets.ts`.

## Tests
- none of its own; `actors/weaponClass.golden.test.ts` pins the rider clips per `MountKind`.

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
  the item files.
- Demon, Spirit of Guardian, Rudolph, Panda, Pet Unicorn and Pet Skeleton go through `CreatePet`
  instead of `CreateMount` (`ZzzCharacter.cpp:12992-12999`): one world object per pet that keeps
  station on its owner and is never ridden. See `PetFollow`.
