# npcs

NPCs that need their own model class, and the factories for the NPC shapes the original builds
inline. Plain NPCs come from `npcFactoryFor` and the NPC model table.

## Public API
- `npcFactoryFor(file, scale)`: a cached `ModelObject` class for one NPC model file.
- `gearedNpcFactory(gear)`: a player-rig NPC wearing one armour set (`NpcGear`): guards,
  doppelgangers, helper NPCs.
- `transformedNpcFactory(...)`: a player rig whose whole body is one part file (transform ring
  NPCs, event mascots, Cursed Temple avatars).
- `TRAP_MODEL_TABLE`, `trapFactoryFor(npcType)`: traps 100-106 drawn with the world object of the
  map they stand on.
- One class per special NPC (below).

## How it works

| File | NPC(s) |
|---|---|
| `archangel.ts` | Archangel (232) and Messenger of Archangel (233): bright mesh, ground halo |
| `baz.ts`, `hanzo.ts`, `pasi.ts`, `trainer.ts`, `zyro.ts` | single-model NPCs (Storage01, Smith01, Wizard01, Breeder, volvo) |
| `girl.ts`, `lumen.ts`, `man.ts` | rig-only models with head / upper / lower part files (Amy, Lumen, Alex, Martin, Harold) |
| `elf_soldier.ts` | Elf Soldier (257): an always-flying Fairy Elf |
| `golden_archer.ts`, `leo.ts`, `plate_npc.ts` | player-rig NPCs in a fixed armour set |
| `hidden_npc.ts` | NPCs the original never draws (the Crywolf altars): no model, `Ready` at once |
| `trap_npc.ts` | traps; 105 (Kanturu cannon) is left to the NPC model table |
| `generic_npc.ts`, `geared_npc.ts`, `transformed_npc.ts` | the factories above |

## Depends on / used by
- uses: `@/controllers/actors`, `@/controllers/render`, `@/controllers/assets`
- used by: `src/controllers/actors/modelFactoryPerId.ts`; `maps/lorencia/create.ts` (`ElfSoldier`)

## Change it
- give an NPC its own look: add `<name>.ts`, then map its npc type in
  `src/controllers/actors/modelFactoryPerId.ts`.
- dress an NPC in a fixed kit: use `gearedNpcFactory` there instead of a new class.
- a new trap: add a row to `TRAP_MODEL_TABLE`.

## Tests
- `trap_npc.test.ts`: every (map, trap) pair resolves to an `Object<world+1>` model file that exists.
