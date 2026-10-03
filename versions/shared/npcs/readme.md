# npcs

What is left of the old NPC folder. NPCs live in `versions/shared/monsters/<name>/` like monsters do
(the server numbers them the same way): their data in `index.ts`, a class of their own in
`model.ts`. The generic NPC shapes are the actors controller's.

| File | Why it is still here |
|---|---|
| `elf_soldier.ts` | re-exports `ElfSoldier` from `../monsters/elf_soldier/model.ts` for `maps/lorencia/create.ts`. |

## Change it
- an NPC's look: its monster folder (see `../monsters/readme.md`), not here.
- once `maps/lorencia/create.ts` imports the monster folder, delete this folder.
