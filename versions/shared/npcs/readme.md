# npcs

What is left of the old NPC folder. NPCs live in `versions/shared/monsters/<name>/` like monsters do
(the server numbers them the same way): their data in `index.ts`, a class of their own in
`model.ts`. The generic NPC shapes are the actors controller's.

| File | Why it is still here |
|---|---|
| `archangel.ts` | Archangel (232) and Messenger of Archangel (233): bright mesh, ground halo, feathers. It needs `TerrainDecal`, which the fx door does not export yet; it registers itself and `../monsters/models.ts` loads it. |
| `elf_soldier.ts` | re-exports `ElfSoldier` from `../monsters/elf_soldier/model.ts` for `maps/lorencia/create.ts`. |
| `trap_npc.ts` | re-exports `TRAP_MODEL_TABLE` from the actors controller for `src/app/logic.ts` and `src/features/_shared/net_helpers.ts`. |

## Public API
- `Archangel`, `ArchangelMessenger`; `ElfSoldier` and `TRAP_MODEL_TABLE` (forwarded).

## Depends on / used by
- uses: `@/controllers/actors`, `@/controllers/assets`, `@/controllers/fx` (and `fx/moveTargetEffect`)
- used by: `versions/shared/monsters/models.ts`, `maps/lorencia/create.ts`, `src/app/logic.ts`,
  `src/features/_shared/net_helpers.ts`

## Change it
- an NPC's look: its monster folder (see `../monsters/readme.md`), not here.
- once the fx door exports `TerrainDecal`, move `archangel.ts` to `../monsters/_archangels/model.ts`
  and drop its line in `models.ts`; once the readers import the new paths, delete the two forwards
  and this folder.

## Tests
- `src/controllers/actors/resolveModel.golden.test.ts` and `../monsters/models.test.ts` cover the
  archangels' registration.
