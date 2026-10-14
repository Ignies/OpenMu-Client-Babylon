# surfaces

What each worn model is made of, for the PBR material's surface looks (Materials "Characters" and
"Enhanced"; Classic never reads it).

```
index.ts            builds the table from the item files and hands it to render's registerSurfaces;
                    app/boot.tsx imports it
surfaces.test.ts    the class of a few known sets, a weapon, a bare body, wings and a monster
```

## Public API
- `index.ts`: `surfaceTable(items)`, and the rule registered when the folder loads. Code reads it
  through `@/controllers/render/surfaceClass` (`surfaceOf(path)`), which the model loader stamps on
  every mesh as `metadata.surface`.

## How it works
- Weapons and shields (groups 0-6) are gear. A helm, armour, pants, gloves or boots set (groups
  7-11) is cloth when no DK, DL or RF can wear it (the robed Wizard, Elf and Summoner sets), else
  gear. The class columns come from the item files, so a new set needs no edit here.
- The bare class bodies (`Player/ArmorClass*`, `HelmClass*`, `SkinClass*`, ...) are skin.
- Everything else (wings, monsters, NPCs, the world) is none.
- Gear turns the derived metal candidate (steel grey and gold texels) into metal; cloth takes a
  sheen; skin a warm scatter at the sun's terminator (`controllers/item_fx` readme, `pbrLooks.ts`).

## Change it
- Move one set: add a model key (`player/armormale10`) override in `index.ts` before the table.
- A new class of body model: extend `CLASS_BODY`.
