# objects

World object model numbers and the signposts that carry real names.

## Public API
- `enum.ts`: `MODEL_*` constants (the original's world object model numbers, `MODEL_TREE01`,
  `MODEL_SIGN01`, ...) and shared enums such as `MonsterActionType`.
- `signs/signObject.ts`: `SignObject` (a `MapTileObject`) and `LorenciaSignObject`, the signs
  that paint a name on their plate.
- `signs/signPlates.ts`: `prefetchSignPlates(objectDir)`, `labelledPlate(...)`, `isSignPlate(key)`.
- `signs/signLabels.ts`: `signTypes(world)`, `signLabel(...)`: what each placement says.

## How it works
- Every signpost draws its text from one of three 64x64 textures (`notice`, `snotice`,
  `snotice02`) whose lettering is decorative. `signPlates.ts` fetches the original once, draws it
  eight times larger, patches the title band and writes the real name. The result is a
  `DynamicTexture` bound per mesh, so the shared material is untouched.
- `signLabels.ts` names each placement: a road post names where the road goes (the map, or the
  neighbour map near its gate); a bracket board names the building it hangs on.
- Each map's `create.ts` binds `SignObject` to its sign types. A placement with no label row
  runs as the plain object. Labels redraw on a language change.

## Depends on / used by
- uses: `@/controllers/terrain/mapTileObject`, `@/controllers/render`, `@/controllers/assets`, `@/i18n`
- used by: map `create.ts` files, actors, the Store and many controllers (`MODEL_*` numbers)

## Change it
- name a new sign: add its placement to `signLabels.ts`, bind its type in the map's `create.ts`.
- a new model number: add the `MODEL_*` constant to `enum.ts`.

## Tests
- None in this folder.
